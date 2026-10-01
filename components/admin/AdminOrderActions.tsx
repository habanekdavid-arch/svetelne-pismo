"use client";

import { useState, useTransition } from "react";
import { PreviewLightbox } from "@/components/orders/PreviewImage";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { deleteOrderAction, setOrderStatus } from "@/app/admin/actions";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orders";

// Action column of an order card, shaped like vytlacto3d's: a stack of
// full-width buttons — the two quiet ones that only look (the sign's picture,
// the order's page), the orange one for the obvious next step in production,
// the blue one to write to the customer, and "Vymazať" set apart at the
// bottom so it is never the button you hit by accident.
//
// Every step forward e-mails the customer (app/admin/actions.ts): taken in
// for processing, started in production, finished, or cancelled.
const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  new:         { to: "in_progress", label: "Prijať na spracovanie" },
  in_progress: { to: "production",  label: "Spustiť do výroby" },
  production:  { to: "done",        label: "Označiť ako hotové" },
};

const BTN = "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-50";
const QUIET = { background: "var(--color-background)", color: "var(--color-foreground)", border: "1px solid var(--color-border)" };

export default function AdminOrderActions({
  orderId,
  orderNumber,
  status,
  customerEmail,
  hasPreview,
}: {
  orderId: number;
  orderNumber: string;
  status: OrderStatus;
  customerEmail: string;
  hasPreview: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [previewOpen, setPreviewOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const onDetail = pathname.startsWith("/admin/objednavka/");
  const next = NEXT_STEP[status];

  function remove() {
    if (!window.confirm(`Naozaj natrvalo vymazať objednávku ${orderNumber}? Nedá sa to vrátiť späť.`)) return;
    startTransition(async () => {
      await deleteOrderAction(orderId);
      // From the order's own page there is nothing left to show — back to the list.
      if (onDetail) router.push("/admin");
    });
  }

  function change(to: OrderStatus) {
    startTransition(() => {
      setOrderStatus(orderId, to);
    });
  }

  return (
    <div className="flex flex-col gap-2 lg:w-[200px]">
      {hasPreview && (
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className={`${BTN} hover:opacity-80`}
          style={QUIET}
        >
          <EyeIcon />
          Náhľad nápisu
        </button>
      )}
      {previewOpen && (
        <PreviewLightbox
          src={`/api/orders/${orderId}/preview`}
          alt={`Náhľad nápisu — objednávka ${orderNumber}`}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {!onDetail && (
        <Link href={`/admin/objednavka/${orderId}`} className={`${BTN} hover:opacity-80`} style={QUIET}>
          Detail objednávky
        </Link>
      )}

      {next && (
        <button
          type="button"
          onClick={() => change(next.to)}
          disabled={pending}
          className={`${BTN} bg-[#FFAE00] text-black hover:bg-[#f0a300]`}
        >
          {next.label}
        </button>
      )}

      <a
        href={`mailto:${customerEmail}?subject=${encodeURIComponent(`Objednávka ${orderNumber} — rozsvieťTO`)}&body=${encodeURIComponent(`Dobrý deň,\n\nk vašej objednávke ${orderNumber}:\n\n\n\nS pozdravom\ntím rozsvieťTO\n4from media, s.r.o.\ninfo@4frommedia.sk · +421 907 907 097`)}`}
        className={`${BTN} bg-blue-600 text-white hover:bg-blue-700`}
      >
        Napísať zákazníkovi
      </a>

      {/* Any other state — back a step, cancelled — only on the order's own
          page, where there is room to think about it. */}
      {onDetail && (
        <>
          <label className="sr-only" htmlFor={`status-${orderId}`}>
            Stav objednávky
          </label>
          <select
            id={`status-${orderId}`}
            value={status}
            disabled={pending}
            onChange={(e) => change(e.target.value as OrderStatus)}
            className="w-full rounded-xl px-3 py-2.5 text-sm font-bold outline-none disabled:opacity-50"
            style={QUIET}
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                Stav: {ORDER_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </>
      )}

      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className={`${BTN} mt-3 border border-red-300 bg-red-50 text-red-600 hover:bg-red-100`}
      >
        Vymazať
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
