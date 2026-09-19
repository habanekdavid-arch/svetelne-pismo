import "server-only";

import type { DeliveryAddress, DeliveryPoint } from "@/lib/orders";

// Packeta (Zásielkovňa) — server side.
//
// Packeta's API is SOAP, or the same thing over plain HTTP with an XML body
// ("REST/XML", https://www.zasilkovna.cz/api/rest): POST a document whose root
// element is the method name and whose children are its arguments. That needs
// no SDK, which is why there is none here — just fetch and two small helpers.
//
// Nothing in this file runs unless PACKETA_API_PASSWORD is set. Without it the
// shop still works: orders are taken and paid for, and the packet is created
// by hand from the admin.

const API_URL = process.env.PACKETA_API_URL || "https://www.zasilkovna.cz/api/rest";

/** The 32-character API password from the Packeta client section. Server only. */
function apiPassword(): string | null {
  const pw = process.env.PACKETA_API_PASSWORD?.trim();
  return pw ? pw : null;
}

/** Is Packeta wired up at all? Everything else checks this first. */
export function packetaConfigured(): boolean {
  return apiPassword() !== null;
}

/**
 * The carrier id Packeta uses for courier delivery to an address. It is
 * account- and country-specific (it comes from Packeta's carrier export), so
 * it is configuration, not a constant.
 */
export function homeCarrierId(): string | null {
  const id = process.env.PACKETA_HOME_CARRIER_ID?.trim();
  return id ? id : null;
}

/** Sender label, as set up at https://client.packeta.com/senders/. */
function senderLabel(): string {
  return process.env.PACKETA_SENDER_LABEL?.trim() || "rozsvietTO";
}

// ── XML ──────────────────────────────────────────────────────────────────────

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type Fields = Record<string, string | number | null | undefined>;

function toXml(fields: Fields): string {
  return Object.entries(fields)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `<${k}>${esc(String(v))}</${k}>`)
    .join("");
}

/**
 * First value of an element, anywhere in the document. Packeta's replies are
 * a handful of flat elements, so a regex is enough and brings in no parser.
 */
function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : null;
}

export class PacketaError extends Error {
  constructor(message: string, readonly body?: string) {
    super(message);
    this.name = "PacketaError";
  }
}

async function call(method: string, args: string): Promise<string> {
  const pw = apiPassword();
  if (!pw) throw new PacketaError("Packeta nie je nakonfigurovaná (chýba PACKETA_API_PASSWORD).");

  const body = `<${method}><apiPassword>${esc(pw)}</apiPassword>${args}</${method}>`;
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    body,
    // Packeta is a third party in the request path of a paid order — never let
    // it hang the webhook.
    signal: AbortSignal.timeout(20_000),
  });

  const text = await res.text();
  if (!res.ok) throw new PacketaError(`Packeta odpovedala ${res.status}`, text);

  const status = tag(text, "status");
  if (status !== "ok") {
    // A fault carries its reason in <string>, and per-field detail in <fault>.
    const reason = tag(text, "string") ?? tag(text, "fault") ?? "neznáma chyba";
    throw new PacketaError(`Packeta odmietla zásielku: ${reason}`, text);
  }
  return text;
}

// ── Packets ──────────────────────────────────────────────────────────────────

export type PacketRecipient = {
  /** Your own order number — 1-36 alphanumeric, unique per packet. */
  number: string;
  name: string;
  surname: string;
  email: string;
  phone?: string | null;
};

export type PacketInput = {
  recipient: PacketRecipient;
  /** Declared value of the contents, for insurance, in `currency`. */
  value: number;
  currency: string;
  /** Gross weight in kilograms. */
  weightKg: number;
  /** Cash on delivery. This shop is paid up front, so it is never set. */
  cod?: number;
  /** Exactly one of these — a chosen pick-up point, or a postal address. */
  point?: DeliveryPoint | null;
  address?: DeliveryAddress | null;
  note?: string | null;
};

export type CreatedPacket = {
  id: string;
  barcode: string;
  barcodeText: string;
};

function attributes(input: PacketInput): string {
  const { recipient } = input;

  // addressId is the branch for a Packeta pick-up, the carrier for anything
  // else — an external carrier's own point additionally needs its code.
  let addressId: string | null = null;
  let carrierPickupPoint: string | null = null;
  if (input.point) {
    if (input.point.carrierId) {
      addressId = input.point.carrierId;
      carrierPickupPoint = input.point.carrierPickupPoint ?? input.point.id;
    } else {
      addressId = input.point.id;
    }
  } else if (input.address) {
    addressId = homeCarrierId();
    if (!addressId) {
      throw new PacketaError(
        "Doručenie na adresu cez Packetu nie je nakonfigurované (chýba PACKETA_HOME_CARRIER_ID).",
      );
    }
  }
  if (!addressId) throw new PacketaError("Zásielka nemá ani výdajné miesto, ani adresu.");

  const fields: Fields = {
    number: recipient.number,
    name: recipient.name.slice(0, 32),
    surname: recipient.surname.slice(0, 32),
    email: recipient.email,
    phone: recipient.phone ?? undefined,
    addressId,
    carrierPickupPoint: carrierPickupPoint ?? undefined,
    value: input.value.toFixed(2),
    currency: input.currency,
    weight: input.weightKg.toFixed(2),
    cod: input.cod ? input.cod.toFixed(2) : undefined,
    note: input.note?.slice(0, 128) ?? undefined,
    eshop: senderLabel(),
    ...(input.address
      ? {
          street: input.address.street.slice(0, 32),
          houseNumber: input.address.houseNumber.slice(0, 16),
          city: input.address.city.slice(0, 32),
          zip: input.address.zip,
        }
      : {}),
  };

  return `<packetAttributes>${toXml(fields)}</packetAttributes>`;
}

/**
 * Checks a consignment without creating it. Worth doing before the customer
 * pays: a rejected address is a question to ask now, not after the money has
 * moved. Returns the reason it was rejected, or null when it is fine.
 */
export async function validatePacket(input: PacketInput): Promise<string | null> {
  try {
    await call("packetAttributesValid", attributes(input));
    return null;
  } catch (err) {
    if (err instanceof PacketaError) return err.message;
    throw err;
  }
}

/** Creates the packet and returns its Packeta id and barcode. */
export async function createPacket(input: PacketInput): Promise<CreatedPacket> {
  const xml = await call("createPacket", attributes(input));
  const id = tag(xml, "id");
  const barcode = tag(xml, "barcode");
  if (!id || !barcode) {
    throw new PacketaError("Packeta nevrátila číslo zásielky.", xml);
  }
  return { id, barcode, barcodeText: tag(xml, "barcodeText") ?? barcode };
}

/** The shipping label as a PDF, base64 as Packeta returns it. */
export async function packetLabelPdfBase64(
  packetId: string,
  format: "A6 on A4" | "A6 on A6" | "A7 on A7" = "A6 on A6",
): Promise<string> {
  const xml = await call(
    "packetLabelPdf",
    `<packetId>${esc(packetId)}</packetId><format>${esc(format)}</format><offset>0</offset>`,
  );
  const pdf = tag(xml, "result");
  if (!pdf) throw new PacketaError("Packeta nevrátila štítok.", xml);
  return pdf;
}

/** Where the packet is now, as Packeta's own status code and text. */
export async function packetStatus(packetId: string): Promise<{ code: string; text: string } | null> {
  const xml = await call("packetStatus", `<packetId>${esc(packetId)}</packetId>`);
  const code = tag(xml, "statusCode");
  if (!code) return null;
  return { code, text: tag(xml, "statusText") ?? "" };
}

/** Splits "Ján Novák" the way Packeta wants it: given name, then the rest. */
export function splitName(full: string): { name: string; surname: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { name: parts[0] || "Zákazník", surname: "—" };
  return { name: parts[0], surname: parts.slice(1).join(" ") };
}
