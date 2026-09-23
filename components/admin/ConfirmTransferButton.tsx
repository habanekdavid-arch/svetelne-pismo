"use client";

import { useTransition } from "react";
import { confirmTransferPaid } from "@/app/admin/actions";

/** "The money is in" — for an order paid by bank transfer. */
export default function ConfirmTransferButton({ groupId }: { groupId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Potvrdiť, že platba za túto objednávku prišla na účet?")) return;
        startTransition(() => {
          confirmTransferPaid(groupId);
        });
      }}
      className="mt-2 rounded-xl bg-green-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
    >
      {pending ? "Ukladám…" : "Platba prijatá"}
    </button>
  );
}
