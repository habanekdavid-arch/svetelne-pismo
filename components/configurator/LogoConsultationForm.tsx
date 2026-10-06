"use client";

import { useEffect, useState } from "react";
import type { Config } from "@/lib/types";
import type { SignSize } from "@/lib/useSignSize";
import { formatBytes } from "@/lib/contact-attachments";
import { MAX_LOGO_BYTES } from "@/lib/logo";
import { snapshotPreview } from "@/lib/sign-preview";

// The last step of a logo sign: not a payment, a request for a consultation.
// The logo file, the sign as configured and how to reach the customer go to
// app/api/logo-consultation; the shop answers with an offer. Open to anyone —
// a signed-in customer only finds their name and phone already filled in.

type Status = "idle" | "sending" | "sent" | "error";

const ERRORS: Record<string, string> = {
  missing_fields: "Vyplňte prosím meno, e-mail a telefón.",
  invalid_email: "Skontrolujte prosím e-mailovú adresu.",
  logo_type: "Tento typ súboru loga nevieme prijať — pošlite SVG, PNG, JPG alebo WEBP.",
  logo_too_big: `Súbor loga je väčší ako ${formatBytes(MAX_LOGO_BYTES)}. Pošlite menší, alebo nám ho pošlite e-mailom na info@4frommedia.sk.`,
};

export default function LogoConsultationForm({
  logo,
  config,
  size,
}: {
  logo: File;
  config: Config;
  size: SignSize;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [sentId, setSentId] = useState<number | null>(null);

  // A signed-in customer's details, so a returning one only presses the button.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(async (data) => {
        if (cancelled || !data?.user) return;
        setName((v) => v || data.user.name || "");
        setEmail((v) => v || data.user.email || "");
        const res = await fetch("/api/profile").catch(() => null);
        const body = res && res.ok ? await res.json().catch(() => null) : null;
        if (!cancelled && body?.profile?.phone) setPhone((v) => v || body.profile.phone);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");
    try {
      const form = new FormData();
      form.append("name", name.trim());
      form.append("email", email.trim());
      form.append("phone", phone.trim());
      form.append("note", note.trim());
      form.append("website", website);
      form.append("config", JSON.stringify(config));
      form.append("size", JSON.stringify(size));
      form.append("logo", logo, logo.name);
      const preview = await snapshotPreview().catch(() => null);
      if (preview) form.append("preview", preview);

      const res = await fetch("/api/logo-consultation", { method: "POST", body: form });
      const body = (await res.json().catch(() => null)) as { id?: number; error?: string } | null;
      if (!res.ok) {
        setError((body?.error && ERRORS[body.error]) || (res.status === 413 ? ERRORS.logo_too_big : ""));
        throw new Error(String(res.status));
      }
      setSentId(body?.id ?? null);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div
        role="status"
        className="rounded-2xl px-5 py-4"
        style={{ background: "color-mix(in srgb, var(--accent) 12%, var(--color-background))", border: "1.5px solid var(--accent)" }}
      >
        <p className="text-[15px] font-extrabold" style={{ color: "var(--color-foreground)" }}>
          Ďakujeme{sentId ? ` — žiadosť č. ${sentId} sme prijali` : ", žiadosť sme prijali"}.
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--color-foreground-soft)" }}>
          Pozrieme sa na vaše logo a ozveme sa vám na {email} s cenovou ponukou. Teraz nič neplatíte.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      <Field label="Meno a priezvisko *" value={name} onChange={setName} autoComplete="name" />
      <Field label="E-mail *" value={email} onChange={setEmail} type="email" autoComplete="email" />
      <Field label="Telefón *" value={phone} onChange={setPhone} type="tel" autoComplete="tel" />
      <label className="block sm:col-span-3">
        <span className="text-[12.5px] font-bold" style={{ color: "var(--color-foreground-soft)" }}>
          Poznámka — kam logo pôjde, termín, čokoľvek, čo máme vedieť
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={2000}
          className="contact-input mt-1.5 w-full rounded-xl px-4 py-3 text-sm"
        />
      </label>

      <div className="flex flex-col items-stretch gap-2 sm:col-span-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5" style={{ color: "var(--color-muted)" }}>
          Logo spolu s nastavením a náhľadom pošleme nášmu tímu. Odoslaním súhlasíte so{" "}
          <a href="/gdpr" className="underline">spracovaním osobných údajov</a>. Nič sa neplatí.
        </p>
        <button
          type="submit"
          disabled={status === "sending"}
          className="btn-press shrink-0 rounded-2xl px-8 py-4 text-base font-black tracking-wide shadow-[0_10px_24px_-10px_rgba(255,174,0,.9)] disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--accent-foreground)", border: "2px solid var(--accent)" }}
        >
          {status === "sending" ? "Odosielam…" : "Odoslať žiadosť o konzultáciu"}
        </button>
      </div>
      {status === "error" && (
        <p role="alert" className="text-sm text-red-500 sm:col-span-3">
          {error || "Žiadosť sa nepodarilo odoslať. Skúste to prosím znova, alebo nám napíšte na info@4frommedia.sk."}
        </p>
      )}
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-[12.5px] font-bold" style={{ color: "var(--color-foreground-soft)" }}>
        {label}
      </span>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="contact-input mt-1.5 w-full rounded-xl px-4 py-3 text-sm"
      />
    </label>
  );
}
