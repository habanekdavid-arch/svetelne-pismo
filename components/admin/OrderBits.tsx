import {
  PAYMENT_STATUS_LABEL,
  QUOTE_STATE_LABEL,
  quoteState,
  type OrderGroup,
} from "@/lib/orders";
import { formatEur } from "@/lib/vat";
import ConfirmTransferButton from "@/components/admin/ConfirmTransferButton";
import InstallationQuoteForm from "@/components/admin/InstallationQuoteForm";
import { INSTALLATION_METHOD, PAYMENT_METHOD_LABEL } from "@/lib/payment-methods";
import { deliveryPlace, DELIVERY_METHOD_LABEL } from "@/lib/shipping";

// Pieces shared by the admin's order list (app/admin/page.tsx) and one
// order's own page (app/admin/objednavka/[id]).

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--color-muted)" }}>
      {children}
    </p>
  );
}

export function SpecLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt style={{ color: "var(--color-muted)" }}>{label}</dt>
      <dd className="truncate font-semibold">{value}</dd>
    </div>
  );
}

/**
 * What the workshop needs in order to send the sign: how and where it goes and
 * whether it has been paid for. Orders from while Packeta was offered still
 * show their packet number, or why the packet could not be created.
 */
export const DELIVERY_LABEL: Record<string, string> = {
  ...DELIVERY_METHOD_LABEL,
  [INSTALLATION_METHOD]: "Montáž u vás",
};

export function DeliveryPanel({ group }: { group: OrderGroup | null }) {
  if (!group) {
    // Placed before checkout existed: there is no delivery or payment to show,
    // but the cell stays so the row's columns keep their places.
    return (
      <div className="min-w-0 text-sm">
        <p className="mb-2 text-xs font-bold tracking-wide" style={{ color: "var(--color-muted)" }}>
          Doprava a platba
        </p>
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>
          Staršia objednávka — dohodnuté mimo e-shopu.
        </p>
      </div>
    );
  }

  const where = deliveryPlace(group) ?? "Osobný odber";

  const paid = group.paymentStatus === "paid";
  const installation = group.deliveryMethod === INSTALLATION_METHOD;
  const quote = quoteState(group);

  return (
    <div className="min-w-0 text-sm">
      <p className="mb-2 text-xs font-bold tracking-wide" style={{ color: "var(--color-muted)" }}>
        {installation ? "Montáž u vás" : "Doprava a platba"}
      </p>
      <dl className="space-y-1" style={{ color: "var(--color-foreground-soft)" }}>
        <SpecLine label="Spôsob" value={DELIVERY_LABEL[group.deliveryMethod] ?? group.deliveryMethod} />
        <SpecLine label={installation ? "Adresa inštalácie" : "Kam"} value={where} />
        {group.customerPhone && <SpecLine label="Telefón" value={group.customerPhone} />}
        {quote && <SpecLine label="Stav" value={QUOTE_STATE_LABEL[quote]} />}
        {quote === "sent" && (
          <SpecLine label="Montáž" value={formatEur(group.deliveryCents / 100)} />
        )}
        {group.paymentMethod && (
          <SpecLine label="Platba cez" value={PAYMENT_METHOD_LABEL[group.paymentMethod]} />
        )}
        {(!installation || quote !== "requested") && (
          <SpecLine label="Platba" value={PAYMENT_STATUS_LABEL[group.paymentStatus]} />
        )}
        {group.packetaBarcode && <SpecLine label="Zásielka" value={group.packetaBarcode} />}
      </dl>
      {paid && (
        <p className="mt-2 text-xs font-bold" style={{ color: "var(--color-accent-text)" }}>
          Zaplatené {formatEur(group.totalCents / 100)}
        </p>
      )}
      {quote === "consult" && (
        <p className="mt-2 text-xs font-bold" style={{ color: "var(--color-accent-text)" }}>
          Nápis je zaplatený — kontaktujte zákazníka a dohodnite montáž, termín a cenu montáže
        </p>
      )}
      {quote === "pending" && (
        <p className="mt-2 text-xs" style={{ color: "var(--color-muted)" }}>
          S montážou — najprv čakáme na platbu za nápis, potom zákazníka kontaktujeme.
        </p>
      )}
      {quote === "requested" && (
        <p className="mt-2 text-xs font-bold" style={{ color: "var(--color-accent-text)" }}>
          Pripraviť cenovú ponuku s montážou — zákazník zatiaľ nič neplatil
        </p>
      )}
      {(quote === "requested" || quote === "sent") && (
        <InstallationQuoteForm
          groupId={group.id}
          itemsEur={group.itemsCents / 100}
          currentEur={quote === "sent" ? group.deliveryCents / 100 : null}
        />
      )}
      {!paid && (group.paymentMethod === "transfer" || quote === "sent") && (
        <ConfirmTransferButton groupId={group.id} />
      )}
      {group.packetaError && (
        <p className="mt-2 text-xs leading-5 text-red-500">
          Packeta: {group.packetaError}
        </p>
      )}
    </div>
  );
}

