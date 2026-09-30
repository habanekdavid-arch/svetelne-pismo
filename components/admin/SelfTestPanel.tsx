"use client";

import { useState, useTransition } from "react";
import { runSelfTest, type SelfTestKind, type SelfTestResult } from "@/app/admin/actions";

// "Test funkcií" — one button per live service the shop depends on. Each runs
// on the server exactly the way the shop uses that service and reports back
// in plain words, so a missing key or a refused login shows up here rather
// than as a customer who never got their confirmation.

const TESTS: { kind: SelfTestKind; label: string; hint: string }[] = [
  { kind: "mail",   label: "Poslať testovací e-mail", hint: "Prihlási sa do schránky a pošle e-mail na adresu vľavo." },
  { kind: "db",     label: "Test databázy",           hint: "Pripojí sa k databáze a spočíta objednávky." },
  { kind: "stripe", label: "Test Stripe",             hint: "Overí kľúč Stripe a či je nastavený webhook." },
  { kind: "quote",  label: "Test výpočtu ceny",       hint: "Server premeria vzorový nápis a vypočíta cenu aj dopravu." },
];

export default function SelfTestPanel({ defaultTo }: { defaultTo: string }) {
  const [to, setTo] = useState(defaultTo);
  const [results, setResults] = useState<Partial<Record<SelfTestKind, SelfTestResult>>>({});
  const [running, setRunning] = useState<SelfTestKind | null>(null);
  const [, startTransition] = useTransition();

  function run(kind: SelfTestKind) {
    setRunning(kind);
    startTransition(async () => {
      try {
        const result = await runSelfTest(kind, kind === "mail" ? to : undefined);
        setResults((r) => ({ ...r, [kind]: result }));
      } catch (err) {
        setResults((r) => ({
          ...r,
          [kind]: { ok: false, message: err instanceof Error ? err.message : String(err), ms: 0 },
        }));
      } finally {
        setRunning(null);
      }
    });
  }

  return (
    <details
      className="mb-8 rounded-3xl border p-5"
      style={{ background: "var(--color-background)", borderColor: "var(--color-border)" }}
    >
      <summary className="cursor-pointer text-sm font-extrabold" style={{ color: "var(--color-foreground)" }}>
        Test funkcií — e-mail, databáza, Stripe, cena
      </summary>

      <a
        href="/admin/emaily"
        className="mt-4 inline-block rounded-xl px-3 py-2 text-xs font-extrabold"
        style={{ border: "2px solid var(--color-foreground)", color: "var(--color-foreground)" }}
      >
        Náhľad všetkých e-mailov →
      </a>

      <label className="mt-4 block max-w-md">
        <span className="mb-1 block text-xs font-bold" style={{ color: "var(--color-muted)" }}>
          Kam poslať testovací e-mail
        </span>
        <input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-full rounded-xl px-3 py-2 text-sm outline-none"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
        />
      </label>

      <ul className="mt-4 grid gap-2 md:grid-cols-2">
        {TESTS.map((t) => {
          const r = results[t.kind];
          return (
            <li
              key={t.kind}
              className="rounded-2xl px-4 py-3 text-sm"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold" style={{ color: "var(--color-foreground)" }}>{t.label}</p>
                  <p className="text-xs leading-5" style={{ color: "var(--color-muted)" }}>{t.hint}</p>
                </div>
                <button
                  type="button"
                  disabled={running !== null}
                  onClick={() => run(t.kind)}
                  className="shrink-0 rounded-xl px-3 py-2 text-xs font-extrabold transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                >
                  {running === t.kind ? "Testujem…" : "Spustiť"}
                </button>
              </div>
              {r && (
                <p
                  role="status"
                  className={`mt-2 rounded-xl px-3 py-2 text-xs leading-5 ${
                    r.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
                  }`}
                >
                  {r.ok ? "✓ " : "✗ "}
                  {r.message}
                  {r.ms > 0 && <span className="opacity-60"> ({r.ms} ms)</span>}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
