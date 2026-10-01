"use client";

import { useTransition } from "react";
import { verifyUserManually } from "@/app/admin/actions";

/** Confirms a customer's e-mail by hand — for when the verification mail never arrived. */
export default function VerifyUserButton({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Overiť e-mail tohto zákazníka ručne? Uvidí ceny a bude môcť objednávať.")) return;
        startTransition(() => {
          verifyUserManually(userId);
        });
      }}
      className="rounded-full bg-green-600 px-2.5 py-0.5 text-[11px] font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
    >
      {pending ? "Overujem…" : "Overiť ručne"}
    </button>
  );
}
