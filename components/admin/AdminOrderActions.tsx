"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { deleteOrderAction, setOrderStatus } from "@/app/admin/actions";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orders";

// Action column of an order card, shaped like vytlacto3d's: a primary blue
// button for the obvious next step, a full status select underneath for
// anything else, and the destructive action pushed to the bottom behind a
// divider so it is never the button you hit by accident.
//
// The "next step" mirrors how its admin works — one button that says what
// happens now, rather than making you find the right value in a dropdown.
const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  new:         { to: "in_progress", label: "Prijať do výroby" },
  in_progress: { to: "done",        label: "Označiť HOTOVÉ" },
};

export default function AdminOrderActions({
  orderId,
  status,
}: {
  orderId: number;
  status: OrderStatus;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const next = NEXT_STEP[status];

  function remove() {
    if (!window.confirm("Naozaj natrvalo vymazať túto objednávku? Nedá sa to vrátiť späť.")) return;
    startTransition(async () => {
      await deleteOrderAction(orderId);
      // From the order's own page there is nothing left to show — back to the list.
      if (pathname.startsWith("/admin/objednavka/")) router.push("/admin");
    });
  }

  function change(to: OrderStatus) {
    startTransition(() => {
      setOrderStatus(orderId, to);
    });
  }

  return (
    <div className="flex flex-col gap-2 xl:min-w-[170px]">
      {next && (
        <button
          type="button"
          onClick={() => change(next.to)}
          disabled={pending}
          className="w-full rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {next.label}
        </button>
      )}

      <label className="sr-only" htmlFor={`status-${orderId}`}>
        Stav objednávky
      </label>
      <select
        id={`status-${orderId}`}
        value={status}
        disabled={pending}
        onChange={(e) => change(e.target.value as OrderStatus)}
        className="w-full rounded-xl px-3 py-2 text-xs font-bold outline-none disabled:opacity-50"
        style={{
          background: "var(--color-background)",
          color: "var(--color-foreground)",
          border: "1px solid var(--color-border)",
        }}
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABEL[s]}
          </option>
        ))}
      </select>

      <div className="mt-auto space-y-2 border-t pt-2" style={{ borderColor: "var(--color-border)" }}>
        {status !== "cancelled" && (
          <button
            type="button"
            onClick={() => change("cancelled")}
            disabled={pending}
            className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
          >
            Zrušiť objednávku
          </button>
        )}
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="w-full rounded-xl px-3 py-1.5 text-[11px] font-semibold text-red-500 underline underline-offset-2 transition hover:text-red-700 disabled:opacity-50"
        >
          Vymazať objednávku
        </button>
      </div>
    </div>
  );
}
