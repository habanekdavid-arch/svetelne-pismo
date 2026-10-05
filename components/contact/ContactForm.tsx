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

// The contact form — on the home page under the FAQ and on /kontakt. The
// message is stored first (app/api/contact → contact_messages, listed in the
// admin) and e-mailed to the shop after, so a mail outage never loses it.
// Files (a logo, a photo of the wall, a drawing) go with it as attachments.

type Status = "idle" | "sending" | "sent" | "error";

const SERVER_ERRORS: Record<string, string> = {
  file_type: "Tento typ súboru nevieme prijať",
  files_too_big: `Prílohy spolu presahujú ${formatBytes(MAX_ATTACHMENTS_BYTES)}. Väčšie súbory nám pošlite e-mailom na info@4frommedia.sk.`,
  too_many_files: `Priložiť sa dá najviac ${MAX_ATTACHMENTS} súborov.`,
};

export default function ContactForm() {
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
        problems.push(`${f.name} — tento typ súboru nevieme prijať.`);
      } else if (next.length >= MAX_ATTACHMENTS) {
        problems.push(`Najviac ${MAX_ATTACHMENTS} súborov — ${f.name} sa už nepridal.`);
      } else if (next.reduce((s, n) => s + n.size, 0) + f.size > MAX_ATTACHMENTS_BYTES) {
        problems.push(`${f.name} (${formatBytes(f.size)}) — prílohy spolu môžu mať najviac ${formatBytes(MAX_ATTACHMENTS_BYTES)}.`);
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
      const res = await fetch("/api/contact", { method: "POST", body: data });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; file?: string } | null;
        const known = body?.error ? SERVER_ERRORS[body.error] : undefined;
        if (known) setError(body?.file ? `${known}: ${body.file}.` : known);
        else if (res.status === 413) setError(SERVER_ERRORS.files_too_big);
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
    <form onSubmit={handleSubmit} className="mx-auto mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
      {/* Honeypot — hidden from people, filled by bots */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <Field label="Meno *" name="name" />
      <Field label="E-mail *" name="email" type="email" />
      <Field label="Predmet *" name="subject" full />

      <div className="sm:col-span-2">
        <label htmlFor="contact-message" className="text-sm font-semibold" style={{ color: "var(--color-foreground-soft)" }}>
          Správa *
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
          Prílohy
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
          <span className="font-semibold">📎 Pridať súbory</span>
          <span className="text-xs" style={{ color: "var(--color-muted)" }}>
            alebo ich sem pretiahnite — {ATTACHMENT_HINT}
          </span>
          <span className="text-xs" style={{ color: "var(--color-muted)" }}>
            najviac {MAX_ATTACHMENTS} súborov, spolu do {formatBytes(MAX_ATTACHMENTS_BYTES)}
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
                    aria-label={`Odstrániť ${f.name}`}
                    className="rounded-lg px-2 text-base leading-none hover:opacity-70"
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
            <li className="text-right text-xs" style={{ color: "var(--color-muted)" }}>
              spolu {formatBytes(total)} z {formatBytes(MAX_ATTACHMENTS_BYTES)}
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
          {status === "sending" ? "Odosielam…" : "Odoslať správu"}
        </button>

        <p aria-live="polite" className="text-center text-sm" style={{ color: "var(--color-muted)" }}>
          {status === "sent" && "Ďakujeme, správu sme dostali. Ozveme sa čo najskôr."}
          {status === "error" &&
            (error || "Správu sa nepodarilo odoslať. Skúste to prosím znova, alebo nám napíšte na info@4frommedia.sk.")}
        </p>
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
