"use client";

import { useRef, useState } from "react";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_HINT,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENTS_BYTES,
  formatBytes,
  isAllowedAttachment,
} from "@/lib/contact-attachments";
import { tk } from "@/lib/i18n/config";
import { useT } from "@/lib/i18n/client";
import { getRecaptchaToken, loadRecaptcha } from "@/lib/recaptcha";
import RecaptchaNotice from "@/components/ui/RecaptchaNotice";

// The contact form — on the home page under the FAQ and on /kontakt. The
// message is stored first (app/api/contact → contact_messages, listed in the
// admin) and e-mailed to the shop after, so a mail outage never loses it.
// Files (a logo, a photo of the wall, a drawing) go with it as attachments.

type Status = "idle" | "sending" | "sent" | "error";

// Translated where shown; {size} and {count} are filled in then.
const SERVER_ERRORS: Record<string, string> = {
  file_type: tk("Tento typ súboru nevieme prijať"),
  files_too_big: tk("Prílohy spolu presahujú {size}. Väčšie súbory nám pošlite e-mailom na info@4frommedia.sk."),
  too_many_files: tk("Priložiť sa dá najviac {count} súborov."),
  recaptcha: tk("Overenie proti robotom neprešlo. Obnovte stránku a skúste to znova, alebo nám napíšte na info@4frommedia.sk."),
};

export default function ContactForm() {
  const t = useT();
  const limits = { size: formatBytes(MAX_ATTACHMENTS_BYTES), count: MAX_ATTACHMENTS };
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const picker = useRef<HTMLInputElement>(null);

  const total = files.reduce((sum, f) => sum + f.size, 0);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    const problems: string[] = [];
    for (const f of Array.from(list)) {
      if (next.some((n) => n.name === f.name && n.size === f.size)) continue;
      if (!isAllowedAttachment(f.name)) {
        problems.push(t("{name} — tento typ súboru nevieme prijať.", { name: f.name }));
      } else if (next.length >= MAX_ATTACHMENTS) {
        problems.push(t("Najviac {count} súborov — {name} sa už nepridal.", { count: MAX_ATTACHMENTS, name: f.name }));
      } else if (next.reduce((s, n) => s + n.size, 0) + f.size > MAX_ATTACHMENTS_BYTES) {
        problems.push(t("{name} ({size}) — prílohy spolu môžu mať najviac {max}.", { name: f.name, size: formatBytes(f.size), max: limits.size }));
      } else {
        next.push(f);
      }
    }
    setFiles(next);
    setFileError(problems.join(" "));
    // Let the same file be picked again after it was removed.
    if (picker.current) picker.current.value = "";
  }

  function removeFile(index: number) {
    setFiles(files.filter((_, i) => i !== index));
    setFileError("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;

    const form = e.currentTarget;
    const source = new FormData(form);
    // Multipart, so the files travel with the text; the browser sets the
    // Content-Type with its boundary itself.
    const data = new FormData();
    for (const key of ["name", "email", "subject", "message", "website"]) {
      data.append(key, String(source.get(key) ?? ""));
    }
    for (const f of files) data.append("files", f, f.name);

    setStatus("sending");
    setError("");
    try {
      // Taken right before sending — a reCAPTCHA token lives two minutes.
      const token = await getRecaptchaToken("contact");
      if (token) data.append("recaptcha", token);
      const res = await fetch("/api/contact", { method: "POST", body: data });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; file?: string } | null;
        const known = body?.error && SERVER_ERRORS[body.error] ? t(SERVER_ERRORS[body.error], limits) : undefined;
        if (known) setError(body?.file ? `${known}: ${body.file}.` : known);
        else if (res.status === 413) setError(t(SERVER_ERRORS.files_too_big, limits));
        throw new Error(String(res.status));
      }
      setStatus("sent");
      form.reset();
      setFiles([]);
      setFileError("");
    } catch {
      setStatus("error");
    }
  }

  return (
    // Google's script comes in once someone starts filling the form in.
    <form
      onSubmit={handleSubmit}
      onFocusCapture={() => void loadRecaptcha()}
      className="mx-auto mt-8 grid max-w-2xl gap-4 sm:grid-cols-2"
    >
      {/* Honeypot — hidden from people, filled by bots */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <Field label={t("Meno *")} name="name" />
      <Field label={t("E-mail *")} name="email" type="email" />
      <Field label={t("Predmet *")} name="subject" full />

      <div className="sm:col-span-2">
        <label htmlFor="contact-message" className="text-sm font-semibold" style={{ color: "var(--color-foreground-soft)" }}>
          {t("Správa *")}
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          className="contact-input mt-2 w-full rounded-xl px-4 py-3 text-sm shadow-sm transition-all duration-200"
        />
      </div>

      <div className="sm:col-span-2">
        <span className="text-sm font-semibold" style={{ color: "var(--color-foreground-soft)" }}>
          {t("Prílohy")}
        </span>
        <label
          htmlFor="contact-files"
          className="contact-input mt-2 flex w-full cursor-pointer flex-col items-center gap-1 rounded-xl px-4 py-5 text-center text-sm shadow-sm transition-all duration-200"
          style={{ borderStyle: "dashed" }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
        >
          <span className="font-semibold">📎 {t("Pridať súbory")}</span>
          <span className="text-xs" style={{ color: "var(--color-muted)" }}>
            {t("alebo ich sem pretiahnite — {hint}", { hint: t(ATTACHMENT_HINT) })}
          </span>
          <span className="text-xs" style={{ color: "var(--color-muted)" }}>
            {t("najviac {count} súborov, spolu do {size}", limits)}
          </span>
        </label>
        <input
          ref={picker}
          id="contact-files"
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT}
          className="sr-only"
          onChange={(e) => addFiles(e.target.files)}
        />

        {files.length > 0 && (
          <ul className="mt-3 grid gap-2">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${f.size}`}
                className="contact-input flex items-center justify-between gap-3 rounded-xl px-4 py-2 text-sm"
              >
                <span className="min-w-0 truncate">{f.name}</span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                    {formatBytes(f.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    aria-label={t("Odstrániť {name}", { name: f.name })}
                    className="rounded-lg px-2 text-base leading-none hover:opacity-70"
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
            <li className="text-right text-xs" style={{ color: "var(--color-muted)" }}>
              {t("spolu {total} z {size}", { total: formatBytes(total), size: limits.size })}
            </li>
          </ul>
        )}

        {fileError && (
          <p role="alert" className="mt-2 text-sm text-red-500">
            {fileError}
          </p>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-2xl px-8 py-3 text-sm font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#FFAE00]/30 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
          style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
        >
          {status === "sending" ? t("Odosielam…") : t("Odoslať správu")}
        </button>

        <p aria-live="polite" className="text-center text-sm" style={{ color: "var(--color-muted)" }}>
          {status === "sent" && t("Ďakujeme, správu sme dostali. Ozveme sa čo najskôr.")}
          {status === "error" &&
            (error || t("Správu sa nepodarilo odoslať. Skúste to prosím znova, alebo nám napíšte na info@4frommedia.sk."))}
        </p>
        <RecaptchaNotice className="text-center" />
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  full = false,
}: {
  label: string;
  name: string;
  type?: string;
  full?: boolean;
}) {
  const id = `contact-${name}`;
  return (
    <div className={full ? "sm:col-span-2" : "sm:col-span-1"}>
      <label htmlFor={id} className="text-sm font-semibold" style={{ color: "var(--color-foreground-soft)" }}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required
        className="contact-input mt-2 w-full rounded-xl px-4 py-3 text-sm shadow-sm transition-all duration-200"
      />
    </div>
  );
}
