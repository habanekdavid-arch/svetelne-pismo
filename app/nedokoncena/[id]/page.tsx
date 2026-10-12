import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUserSession } from "@/lib/user-auth";
import { getOrderGroup, groupOrderNumber, listOrdersForGroup, payDeadline, payWindowClosed } from "@/lib/orders";
import { formatDate } from "@/lib/dates";
import { oneLine } from "@/lib/sign-text";
import { materialById } from "@/lib/options";
import { formatEur } from "@/lib/vat";
import { bankAccount, variableSymbol } from "@/lib/bank";
import { stripeConfigured } from "@/lib/stripe";
import PayAgainButton from "@/components/orders/PayAgainButton";
import { getT } from "@/lib/i18n/server";
import { rich } from "@/lib/i18n/rich";

export const metadata: Metadata = {
  title: "Nedokončená objednávka | rozsvieťTO",
  robots: { index: false, follow: false },
};

// Where Stripe sends the customer who backed out of paying. The order is
// saved; this says so, shows what is in it, and offers both ways to finish:
// the card again, or a bank transfer with everything needed for it.
export default async function UnfinishedOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = await getT();
  const session = await getUserSession();
  const { id } = await params;
  if (!session) redirect(`/prihlasenie?spat=${encodeURIComponent(`/nedokoncena/${id}`)}`);

  const group = await getOrderGroup(id);
  if (!group || group.userId !== session.userId) notFound();
  // Paid in the meantime (another tab, a slow webhook) — show the thank-you.
  if (group.paymentStatus === "paid") redirect(`/dakujeme/${group.id}`);

  const orders = await listOrdersForGroup(group.id);
  const closed = payWindowClosed(group);
  const no = groupOrderNumber(group);
  const bank = bankAccount();
  const vs = orders[0] ? variableSymbol(orders[0].id) : null;

  return (
    <main className="px-5 py-16" style={{ background: "var(--color-background)" }}>
      <div className="mx-auto max-w-2xl">
        <div
          className="rounded-3xl p-8 text-center shadow-sm"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-2xl font-black text-amber-800" aria-hidden="true">
            !
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: "var(--color-muted)" }}>
            {t("Objednávka {number}", { number: no })}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-foreground)" }}>
            {t("Objednávka nie je dokončená")}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-7" style={{ color: "var(--color-muted)" }}>
            {t("Platba neprebehla a nič sme vám nestrhli. Objednávku máme uloženú — dokončite ju platbou kartou alebo prevodom. Výrobu začneme hneď, ako platba príde.")}
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm font-bold" style={{ color: closed ? "#dc2626" : "var(--color-foreground)" }}>
            {closed
              ? t("Lehota na dokončenie (7 dní) uplynula. Napíšte nám a objednávku obnovíme.")
              : t("Dokončiť a zaplatiť ju môžete do {date}.", { date: formatDate(payDeadline(group)) })}
          </p>
          {stripeConfigured() && group.totalCents > 0 && !closed && (
            <div className="mt-6 flex justify-center">
              <PayAgainButton groupId={group.id} label={t("Zaplatiť kartou {amount}", { amount: formatEur(group.totalCents / 100) })} />
            </div>
          )}
        </div>

        <section
          className="mt-6 rounded-3xl p-6"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <h2 className="text-base font-extrabold" style={{ color: "var(--color-foreground)" }}>{t("Čo objednávate")}</h2>
          <ul className="mt-3 space-y-2">
            {orders.map((o) => (
              <li key={o.id} className="flex items-start justify-between gap-3 text-sm">
                <span>
                  <span className="font-bold" style={{ color: "var(--color-foreground)" }}>{oneLine(o.config.text) || t("Nápis")}</span>
                  <span className="block text-xs" style={{ color: "var(--color-muted)" }}>
                    {t(materialById(o.config.material).displayName)} · {t("výška písmen {mm} mm", { mm: o.config.height })}
                  </span>
                </span>
                <span className="shrink-0 font-bold" style={{ color: "var(--color-foreground)" }}>
                  {formatEur((o.priceCents ?? o.price * 100) / 100)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t pt-3 text-base font-extrabold" style={{ borderColor: "var(--color-border)", color: "var(--color-foreground)" }}>
            <span>{t("Spolu s DPH")}</span>
            <span>{formatEur(group.totalCents / 100)}</span>
          </div>
        </section>

        {bank && vs && group.totalCents > 0 && !closed && (
          <section className="mt-6 rounded-3xl border border-orange-200 bg-orange-50 p-6 text-sm text-orange-900">
            <h2 className="text-base font-extrabold">{t("Alebo zaplaťte prevodom")}</h2>
            <dl className="mt-3 space-y-1">
              <Row label={t("Suma")} value={formatEur(group.totalCents / 100)} />
              <Row label={t("IBAN")} value={bank.iban} />
              {bank.bic && <Row label={t("BIC")} value={bank.bic} />}
              <Row label={t("Variabilný symbol")} value={vs} />
              <Row label={t("Príjemca")} value={bank.holder} />
              <Row label={t("Správa pre príjemcu")} value={t("Objednávka {number}", { number: no })} />
            </dl>
            <p className="mt-3 text-xs">{t("Po prijatí platby vám pošleme potvrdenie e-mailom.")}</p>
          </section>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={`/objednavka/${group.id}`}
            className="rounded-2xl px-5 py-3 text-sm font-bold"
            style={{ background: "var(--color-background)", color: "var(--color-foreground)", border: "1px solid var(--color-border)" }}
          >
            {t("Detail objednávky")}
          </Link>
          <Link
            href="/ucet/objednavky"
            className="rounded-2xl px-5 py-3 text-sm font-bold"
            style={{ background: "var(--color-background)", color: "var(--color-foreground)", border: "1px solid var(--color-border)" }}
          >
            {t("Moje objednávky")}
          </Link>
        </div>
        <p className="mt-6 text-center text-xs" style={{ color: "var(--color-muted)" }}>
          {rich(t("Otázky? Napíšte na {email} alebo zavolajte na {phone}."), {
            email: <a href="mailto:info@4frommedia.sk" className="font-semibold underline">info@4frommedia.sk</a>,
            phone: <a href="tel:+421907907097" className="font-semibold underline">+421 907 907 097</a>,
          })}
        </p>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="opacity-80">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}
