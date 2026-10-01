"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { onSessionChange } from "@/lib/session-client";
import VerifyCodeForm from "@/components/auth/VerifyCodeForm";

// "Overte svoj e-mail" — shown to a signed-in customer whose address is not
// confirmed yet (a new account): type in the code from the e-mail, or send it
// again. Also says how clicking the link went, when the verify route sends
// the customer back here with ?overenie=ok / ?overenie=neplatne.

export default function VerifyEmailNotice() {
  const params = useSearchParams();
  const result = params.get("overenie");
  const [pending, setPending] = useState<{ email: string } | null>(null);
  const [justVerified, setJustVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = () =>
      fetch("/api/auth/me", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          setPending(d?.user && d.user.verified === false ? { email: d.user.email } : null);
        })
        .catch(() => {});
    check();
    const off = onSessionChange(check);
    return () => { cancelled = true; off(); };
  }, [result]);

  if (result === "ok" || justVerified) {
    return <Banner tone="ok">E-mail je overený. Ďakujeme — teraz uvidíte ceny a môžete objednávať.</Banner>;
  }
  if (result === "neplatne" && !pending) {
    return (
      <Banner tone="warn">
        Overovací odkaz je neplatný alebo mu vypršala platnosť. Prihláste sa a pošlite si nový kód.
      </Banner>
    );
  }
  if (!pending) return null;

  return (
    <Banner tone="warn">
      <span className="w-full sm:w-auto">
        Overte prosím svoj e-mail — kód sme poslali na <strong>{pending.email}</strong>. Cenu uvidíte
        a objednať môžete až po overení.
      </span>
      <VerifyCodeForm onVerified={() => setJustVerified(true)} />
    </Banner>
  );
}

function Banner({ tone, children }: { tone: "ok" | "warn"; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className={`mx-auto my-4 flex max-w-3xl flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
        tone === "ok" ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      {children}
    </div>
  );
}
