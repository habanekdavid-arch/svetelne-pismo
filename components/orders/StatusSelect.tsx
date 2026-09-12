"use client";

import { useTransition } from "react";
import { setOrderStatus } from "@/app/admin/actions";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orders";

export default function StatusSelect({ orderId, status }: { orderId: number; status: OrderStatus }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as OrderStatus;
        startTransition(() => {
          setOrderStatus(orderId, next);
        });
      }}
      className="rounded-lg px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide outline-none disabled:opacity-50"
      style={{
        background: "var(--color-surface-raised)",
        color: "var(--color-foreground)",
        border: "1px solid var(--color-border)",
      }}
      aria-label="Stav objednávky"
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s}>
          {ORDER_STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}
