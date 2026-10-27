"use client";

import { useEffect, useState } from "react";
import type { Config } from "@/lib/types";
import type { SignSize } from "@/lib/useSignSize";
import { formatBytes } from "@/lib/contact-attachments";
import { MAX_LOGO_BYTES } from "@/lib/logo";
import { snapshotPreview } from "@/lib/sign-preview";
import { tk } from "@/lib/i18n/config";
import { useT } from "@/lib/i18n/client";
import { rich } from "@/lib/i18n/rich";
import { getRecaptchaToken, loadRecaptcha } from "@/lib/recaptcha";
import RecaptchaNotice from "@/components/ui/RecaptchaNotice";

// The last step of a logo sign: not a payment, a request for a consultation.
// The logo file, the sign as configured and how to reach the customer go to
// app/api/logo-consultation; the shop answers with an offer. Open to anyone —
// a signed-in customer only finds their name and phone already filled in.

type Status = "idle" | "sending" | "sent" | "error";

// Translated where shown; {size} is filled in then.
const ERRORS: Record<string, string> = {
  missing_fields: tk("Vyplňte prosím meno, e-mail a telefón."),
  invalid_email: tk("Skontrolujte prosím e-mailovú adresu."),
  logo_type: tk("Tento typ súboru loga nevieme prijať — pošlite PDF, SVG, PNG, JPG alebo WEBP."),
  logo_too_big: tk("Súbor loga je väčší ako {size}. Pošlite menší, alebo nám ho pošlite e-mailom na info@4frommedia.sk."),
  recaptcha: tk("Overenie proti robotom neprešlo. Obnovte stránku a skúste to znova, alebo nám napíšte na info@4frommedia.sk."),
};

export default function LogoConsultationForm({
  logo,
  config,
  size,
  lightBox,
  facePrint,
}: {
  logo: File;
  config: Config;
  size: SignSize;
  /** Made as a light box — the whole picture, background and all. */
  lightBox: boolean;
  /** The face printed with the logo's own artwork. */
  facePrint: boolean;
}) {
  const t = useT();
  const sizeLimit = { size: formatBytes(MAX_LOGO_BYTES) };
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
      form.append("lightBox", lightBox ? "1" : "0");
      form.append("facePrint", facePrint ? "1" : "0");
      form.append("logo", logo, logo.name);
      const preview = await snapshotPreview().catch(() => null);
      if (preview) form.append("preview", preview);

      const token = await getRecaptchaToken("logo_consultation");
      if (token) form.append("recaptcha", token);

      const res = await fetch("/api/logo-consultation", { method: "POST", body: form });
      const body = (await res.json().catch(() => null)) as { id?: number; error?: string } | null;
      if (!res.ok) {
        const known = (body?.error && ERRORS[body.error]) || (res.status === 413 ? ERRORS.logo_too_big : "");
        setError(known ? t(known, sizeLimit) : "");
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
          {sentId ? t("Ďakujeme — žiadosť č. {id} sme prijali.", { id: sentId }) : t("Ďakujeme, žiadosť sme prijali.")}
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--color-foreground-soft)" }}>
          {t("Pozrieme sa na vaše logo a ozveme sa vám na {email} s cenovou ponukou. Teraz nič neplatíte.", { email })}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} onFocusCapture={() => void loadRecaptcha()} className="grid gap-3 sm:grid-cols-3">
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
      <Field label={t("Meno a priezvisko *")} value={name} onChange={setName} autoComplete="name" />
      <Field label={t("E-mail *")} value={email} onChange={setEmail} type="email" autoComplete="email" />
      <Field label={t("Telefón *")} value={phone} onChange={setPhone} type="tel" autoComplete="tel" />
      <label className="block sm:col-span-3">
        <span className="text-[12.5px] font-bold" style={{ color: "var(--color-foreground-soft)" }}>
          {t("Poznámka — kam logo pôjde, termín, čokoľvek, čo máme vedieť")}
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
          {rich(t("Logo spolu s nastavením a náhľadom pošleme nášmu tímu. Odoslaním súhlasíte so {gdpr}. Nič sa neplatí."), {
            gdpr: <a href="/gdpr" className="underline">{t("spracovaním osobných údajov")}</a>,
          })}
        </p>
        <button
          type="submit"
          disabled={status === "sending"}
          className="btn-press shrink-0 rounded-2xl px-8 py-4 text-base font-black tracking-wide shadow-[0_10px_24px_-10px_rgba(255,174,0,.9)] disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--accent-foreground)", border: "2px solid var(--accent)" }}
        >
          {status === "sending" ? t("Odosielam…") : t("Odoslať žiadosť o konzultáciu")}
        </button>
      </div>
      {status === "error" && (
        <p role="alert" className="text-sm text-red-500 sm:col-span-3">
          {error || t("Žiadosť sa nepodarilo odoslať. Skúste to prosím znova, alebo nám napíšte na info@4frommedia.sk.")}
        </p>
      )}
      <RecaptchaNotice className="sm:col-span-3" />
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
