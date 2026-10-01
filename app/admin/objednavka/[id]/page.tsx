import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminIdentity } from "@/lib/admin-auth";
import {
  getOrder,
  getOrderGroup,
  listOrdersForGroup,
  listOrdersForUser,
  PAYMENT_STATUS_LABEL,
  type OrderGroup,
} from "@/lib/orders";
import { getUserProfile, type Address } from "@/lib/profile";
import { isVerified } from "@/lib/email-verification.server";
import { prisma } from "@/lib/prisma";
import { previewIds } from "@/lib/order-previews.server";
import {
  fontOptions,
  MATERIALS,
  depthMmFor,
  hasSeparateFace,
  faceColorOf,
  colorLabel,
  variantLabel,
} from "@/lib/options";
import { formatEur } from "@/lib/vat";
import StatusBadge from "@/components/orders/StatusBadge";
import AdminOrderActions from "@/components/admin/AdminOrderActions";
import AdminNav from "@/components/admin/AdminNav";
import { Label, SpecLine, DeliveryPanel } from "@/components/admin/OrderBits";

export const metadata: Metadata = {
  title: "Detail objednávky | rozsvieťTO",
  robots: { index: false, follow: false },
};

// One order on its own page: everything about the customer written out
// (account, company, both addresses), the sign in full, delivery and payment
// with the actions that go with them, and the other signs from the same
// checkout.
export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminIdentity();
  if (!session) redirect("/admin/prihlasenie");

  const { id } = await params;
  const order = await getOrder(Number(id));
  if (!order) notFound();

  const group: OrderGroup | null = order.groupId ? await getOrderGroup(order.groupId) : null;
  const [profile, user, verified, userOrders] = await Promise.all([
    getUserProfile(order.userId).catch(() => null),
    prisma.user.findUnique({ where: { id: order.userId } }).catch(() => null),
    isVerified(order.userId).catch(() => true),
    listOrdersForUser(order.userId).catch(() => []),
  ]);
  const hasPreview = (await previewIds([order.id]).catch(() => new Set<number>())).has(order.id);
  const siblings = group ? (await listOrdersForGroup(group.id)).filter((o) => o.id !== order.id) : [];

  const font = fontOptions.find((f) => f.id === order.config.font);
  const material = MATERIALS.find((m) => m.id === order.config.material);
  const phone = group?.customerPhone || profile?.phone || "";
  const company = profile?.accountType === "COMPANY";

  return (
    <main className="min-h-screen px-5 py-12" style={{ background: "var(--color-surface)" }}>
      <div className="mx-auto max-w-6xl">
        <AdminNav active="orders" />

        <Link href="/admin" className="text-sm font-semibold underline underline-offset-4" style={{ color: "var(--color-muted)" }}>
          ← Späť na objednávky
        </Link>

        {/* Header — number, state, price, date, and what to do next */}
        <div
          className="mt-4 flex flex-wrap items-start justify-between gap-6 rounded-3xl border p-6"
          style={{ background: "var(--color-background)", borderColor: "var(--color-border)" }}
        >
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-foreground)" }}>
              {order.number}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
              Prijatá{" "}
              {new Date(order.createdAt).toLocaleString("sk-SK", {
                day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
              })}{" "}
              · #{order.id}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={order.status} />
              {group && (
                <span
                  className="inline-flex rounded-full border px-3 py-1 text-xs font-bold"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-foreground-soft)" }}
                >
                  Platba: {PAYMENT_STATUS_LABEL[group.paymentStatus]}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <Label>Cena nápisu s DPH</Label>
            <p className="text-3xl font-extrabold" style={{ color: "var(--color-foreground)" }}>
              {formatEur(order.price)}
            </p>
            {group && (
              <p className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
                Celá objednávka {formatEur(group.totalCents / 100)} vrátane dopravy
              </p>
            )}
          </div>
          <div className="w-full sm:w-auto">
            <AdminOrderActions
              orderId={order.id}
              orderNumber={order.number}
              status={order.status}
              customerEmail={order.customerEmail}
              hasPreview={hasPreview}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Customer */}
          <Card title="Zákazník">
            <dl className="space-y-1.5">
              <SpecLine label="Meno" value={order.customerName} />
              <Row label="E-mail">
                <a href={`mailto:${order.customerEmail}`} className="underline">{order.customerEmail}</a>
              </Row>
              {phone && (
                <Row label="Telefón">
                  <a href={`tel:${phone.replace(/\s/g, "")}`} className="underline">{phone}</a>
                </Row>
              )}
              <SpecLine label="E-mail overený" value={verified ? "áno" : "nie"} />
              <SpecLine label="Typ účtu" value={company ? "Firma" : profile?.soleTrader ? "Živnostník" : "Súkromná osoba"} />
              {company && <SpecLine label="Firma" value={profile?.companyName || "—"} />}
              {(company || profile?.soleTrader) && (
                <>
                  <SpecLine label="IČO" value={profile?.ico || "—"} />
                  <SpecLine label="DIČ" value={profile?.dic || "—"} />
                  {profile?.vatPayer && <SpecLine label="IČ DPH" value={profile.icDph || "—"} />}
                </>
              )}
              {user && (
                <SpecLine
                  label="Registrovaný od"
                  value={new Date(user.createdAt).toLocaleDateString("sk-SK")}
                />
              )}
              <SpecLine label="Objednávok spolu" value={String(userOrders.length)} />
            </dl>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <AddressBlock title="Fakturačná adresa" address={profile?.billing} fallback="Rovnaká ako dodacia" />
              <AddressBlock title="Dodacia adresa z účtu" address={profile?.shipping} />
            </div>
            {!profile && (
              <p className="mt-3 text-xs" style={{ color: "var(--color-muted)" }}>
                Zákazník nemá vyplnený profil (starší účet).
              </p>
            )}
            {user && (
              <Link
                href={`/admin/pouzivatelia#${user.id}`}
                className="mt-4 inline-block text-xs font-bold underline"
                style={{ color: "var(--color-foreground)" }}
              >
                Zobraziť zákazníka v zozname používateľov
              </Link>
            )}
          </Card>

          {/* The sign */}
          <Card title="Nápis">
            {hasPreview && (
              <a href={`/api/orders/${order.id}/preview`} target="_blank" rel="noopener noreferrer" className="mb-4 block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/orders/${order.id}/preview`}
                  alt={`Náhľad nápisu ${order.config.text}`}
                  className="w-full rounded-2xl border"
                  style={{ borderColor: "var(--color-border)" }}
                />
              </a>
            )}
            <p className="whitespace-pre-line text-xl font-extrabold" style={{ color: "var(--color-foreground)" }}>
              {order.config.text}
            </p>
            <dl className="mt-4 space-y-1.5">
              <SpecLine label="Svietenie" value={variantLabel(order.config)} />
              <SpecLine label="Prevedenie" value={material?.displayName ?? order.config.material} />
              <SpecLine label="Font" value={font?.name ?? order.config.font} />
              <SpecLine label="Výška písmen" value={`${order.config.height} mm`} />
              <SpecLine label="Hrúbka" value={`${depthMmFor(order.config.material, order.config.height)} mm`} />
              {hasSeparateFace(order.config.material) ? (
                <>
                  <SpecLine label="Čelo" value={colorLabel(faceColorOf(order.config))} />
                  <SpecLine label="Telo" value={colorLabel(order.config.bodyColor)} />
                </>
              ) : (
                <SpecLine label="Farba" value={colorLabel(order.config.bodyColor)} />
              )}
            </dl>
          </Card>

          {/* Delivery and payment, with the quote form / "Platba prijatá" */}
          <Card title="Doprava a platba">
            <DeliveryPanel group={group} />
          </Card>
        </div>

        {siblings.length > 0 && (
          <div className="mt-6">
            <Card title={`Ďalšie nápisy v tej istej objednávke (${siblings.length})`}>
              <ul className="space-y-2">
                {siblings.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <Link href={`/admin/objednavka/${s.id}`} className="font-bold underline" style={{ color: "var(--color-foreground)" }}>
                      {s.number} — {s.config.text.replace(/\n/g, " / ")}
                    </Link>
                    <span style={{ color: "var(--color-muted)" }}>{formatEur(s.price)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-3xl border p-6 text-sm"
      style={{ background: "var(--color-background)", borderColor: "var(--color-border)", color: "var(--color-foreground-soft)" }}
    >
      <h2 className="mb-4 text-base font-extrabold" style={{ color: "var(--color-foreground)" }}>{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt style={{ color: "var(--color-muted)" }}>{label}</dt>
      <dd className="truncate font-semibold">{children}</dd>
    </div>
  );
}

function AddressBlock({ title, address, fallback }: { title: string; address?: Address; fallback?: string }) {
  const filled = address && (address.street || address.city || address.zip);
  return (
    <div>
      <Label>{title}</Label>
      {filled ? (
        <p className="font-semibold leading-6" style={{ color: "var(--color-foreground)" }}>
          {address.street}
          <br />
          {address.zip} {address.city}
          {address.country && (
            <>
              <br />
              {address.country}
            </>
          )}
        </p>
      ) : (
        <p style={{ color: "var(--color-muted)" }}>{fallback ?? "—"}</p>
      )}
    </div>
  );
}
