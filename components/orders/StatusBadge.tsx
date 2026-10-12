import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orders";

// Status pill in vytlacto3d's admin shape: a bordered, fully rounded chip in a
// solid status colour — amber for the newest state, blue for work in progress,
// green for finished, red for cancelled. The same four colours its order list
// uses, so the two admins read identically.
const STATUS_CLASS: Record<OrderStatus, string> = {
  new:         "border-[#FFAE00] bg-[#FFAE00] text-black",
  in_progress: "border-blue-600 bg-blue-600 text-white",
  production:  "border-violet-600 bg-violet-600 text-white",
  done:        "border-green-600 bg-green-600 text-white",
  cancelled:   "border-red-500 bg-red-500 text-white",
};

/** `label` is the status already translated — customer pages pass it; the admin reads Slovak. */
export default function StatusBadge({ status, label }: { status: OrderStatus; label?: string }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${STATUS_CLASS[status]}`}>
      {label ?? ORDER_STATUS_LABEL[status]}
    </span>
  );
}
