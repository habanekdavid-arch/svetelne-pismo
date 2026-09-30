"use client";

import { useState } from "react";

// The contact form — on the home page under the FAQ and on /kontakt. The
// message is stored first (app/api/contact → contact_messages, listed in the
// admin) and e-mailed to the shop after, so a mail outage never loses it.

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;

    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          subject: data.get("subject"),
          message: data.get("message"),
          website: data.get("website"), // honeypot
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("sent");
      form.reset();
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
      <Field label="Email *" name="email" type="email" />
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

      <div className="flex flex-col items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-2xl px-8 py-3 text-sm font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#FFAE00]/30 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
          style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
        >
          {status === "sending" ? "Odosielam…" : "Odoslať správu"}
        </button>

        <p aria-live="polite" className="text-sm" style={{ color: "var(--color-muted)" }}>
          {status === "sent" && "Ďakujeme, správu sme dostali. Ozveme sa čo najskôr."}
          {status === "error" && "Správu sa nepodarilo odoslať. Skúste to prosím znova, alebo nám napíšte na info@4frommedia.sk."}
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
