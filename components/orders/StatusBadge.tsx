import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orders";

const STATUS_COLOR: Record<OrderStatus, { bg: string; fg: string }> = {
  new:         { bg: "var(--color-surface-raised)", fg: "var(--color-muted)" },
  in_progress: { bg: "var(--color-primary)",         fg: "#000" },
  done:        { bg: "#16a34a",                      fg: "#fff" },
  cancelled:   { bg: "transparent",                  fg: "var(--color-muted)" },
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const c = STATUS_COLOR[status];
  return (
    <span
      className="inline-block rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide"
      style={{
        background: c.bg,
        color: c.fg,
        border: status === "cancelled" ? "1px solid var(--color-border)" : "none",
      }}
    >
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
