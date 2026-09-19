import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUserSession } from "@/lib/user-auth";
import {
  getOrderGroup,
  listOrdersForGroup,
  PAYMENT_STATUS_LABEL,
  type OrderGroup,
} from "@/lib/orders";
import { materialById } from "@/lib/options";
import { oneLine } from "@/lib/sign-text";
import { formatEur } from "@/lib/vat";
import AccountShell, { AccountSection } from "@/components/account/AccountShell";
import PayAgainButton from "@/components/orders/PayAgainButton";

export const metadata: Metadata = {
  title: "Objednávka | rozsvieťTO",
};

// Where Stripe sends the customer back to, and where they land from "Moje
// objednávky". `?stav` is only what the browser was told on the way back — it
// decides the wording, never the truth. Whether the order is paid comes from
// the row, which only the verified webhook writes.

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stav?: string }>;
};

export default async function OrderPage({ params, searchParams }: Props) {
  const session = await getUserSession();
  if (!session) redirect("/prihlasenie");

  const { id } = await params;
  const { stav } = await searchParams;

  const group = await getOrderGroup(id);
  // An order belongs to the account that placed it. A wrong id and someone
  // else's id must look the same from outside.
  if (!group || group.userId !== session.userId) notFound();

  const orders = await listOrdersForGroup(id);
  const paid = group.paymentStatus === "paid";
  const cancelled = stav === "zrusene";

  return (
    <AccountShell
      title="Objednávka"
      description={`Číslo ${group.id.split("-")[0].toUpperCase()}`}
    >
      <AccountSection eyebrow="Stav" title={headline(group, cancelled)}>
        <p className="mt-3 text-sm leading-6" style={{ color: "var(--color-muted)" }}>
          {body(group, cancelled)}
        </p>

        {!paid && !cancelled && group.totalCents > 0 && (
          <div className="mt-5">
            <PayAgainButton groupId={group.id} />
          </div>
        )}
        {cancelled && group.totalCents > 0 && (
          <div className="mt-5">
            <PayAgainButton groupId={group.id} label="Skúsiť platbu znova" />
          </div>
        )}

        {/* What was ordered. */}
        <ul className="mt-6 space-y-2">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex items-start justify-between gap-3 rounded-xl px-4 py-3"
              style={{ background: "var(--color-surface)" }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold" style={{ color: "var(--color-foreground)" }}>
                  {oneLine(order.config.text) || "Váš nápis"}
                </p>
                <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                  {materialById(order.config.material).displayName} · výška písmen {order.config.height} mm
                </p>
              </div>
              <span className="shrink-0 text-sm font-black" style={{ color: "var(--color-foreground)" }}>
                {formatEur((order.priceCents ?? order.price * 100) / 100)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-2 text-sm">
          <Row label="Doprava" value={deliveryLabel(group)} />
          {group.deliveryCents > 0 && (
            <Row label="Cena dopravy" value={formatEur(group.deliveryCents / 100)} />
          )}
          <Row label="Platba" value={PAYMENT_STATUS_LABEL[group.paymentStatus]} />
          {group.packetaBarcode && (
            <Row label="Číslo zásielky" value={group.packetaBarcode} />
          )}
          <div
            className="flex items-baseline justify-between border-t pt-3"
            style={{ borderColor: "var(--color-border)" }}
          >
            <dt className="text-xs font-black tracking-wide" style={{ color: "var(--color-muted)" }}>
              Spolu s DPH
            </dt>
            <dd className="text-2xl font-black" style={{ color: "var(--color-foreground)" }}>
              {formatEur(group.totalCents / 100)}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/ucet/objednavky"
            className="rounded-full px-6 py-3 text-xs font-black transition hover:opacity-80"
            style={{ background: "var(--color-surface-raised)", color: "var(--color-foreground)" }}
          >
            Moje objednávky
          </Link>
          <Link
            href="/"
            className="rounded-full px-6 py-3 text-xs font-black transition hover:opacity-90"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            Navrhnúť ďalší nápis
          </Link>
        </div>
      </AccountSection>
    </AccountShell>
  );
}

function headline(group: OrderGroup, cancelled: boolean): string {
  if (group.paymentStatus === "paid") return "Objednávka je zaplatená";
  if (cancelled) return "Platba nebola dokončená";
  if (group.paymentStatus === "failed") return "Platba zlyhala";
  if (group.totalCents === 0) return "Objednávka je prijatá";
  return "Objednávka čaká na zaplatenie";
}

function body(group: OrderGroup, cancelled: boolean): string {
  if (group.paymentStatus === "paid") {
    return group.deliveryMethod.startsWith("packeta")
      ? "Ďakujeme. Nápis ideme vyrábať a hneď ako bude hotový, odošleme ho — číslo zásielky sa objaví tu a pošleme vám ho aj e-mailom."
      : "Ďakujeme. Nápis ideme vyrábať a o vyzdvihnutí sa vám ozveme.";
  }
  if (cancelled) {
    return "Platba bola prerušená a nič sme vám nestrhli. Objednávku máme uloženú — môžete ju zaplatiť kedykoľvek.";
  }
  if (group.totalCents === 0) {
    return "Objednávku máme. Ozveme sa vám s potvrdením ceny a termínu.";
  }
  return "Objednávku máme uloženú. Dokončite prosím platbu.";
}

function deliveryLabel(group: OrderGroup): string {
  if (group.deliveryPoint) {
    const p = group.deliveryPoint;
    return `Packeta — ${p.name}${p.street ? `, ${p.street}` : ""}`;
  }
  if (group.deliveryAddress) {
    const a = group.deliveryAddress;
    return `${a.street} ${a.houseNumber}, ${a.zip} ${a.city}`;
  }
  return "Osobný odber";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-xs font-black tracking-wide" style={{ color: "var(--color-muted)" }}>
        {label}
      </dt>
      <dd className="text-right text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
        {value}
      </dd>
    </div>
  );
}
