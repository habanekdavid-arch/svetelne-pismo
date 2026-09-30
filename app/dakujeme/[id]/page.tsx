import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Clock, Mail, Package, Wrench } from "lucide-react";
import { getUserSession } from "@/lib/user-auth";
import { getOrderGroup, listOrdersForGroup, quoteState } from "@/lib/orders";
import { materialById, variantLabel } from "@/lib/options";
import { oneLine } from "@/lib/sign-text";
import { formatEur } from "@/lib/vat";
import { bankAccount, variableSymbol } from "@/lib/bank";
import { INSTALLATION_METHOD } from "@/lib/payment-methods";
import { afterMadeText, deliveryPlace, DELIVERY_METHOD_LABEL, PRODUCTION_TIME } from "@/lib/shipping";
import AwaitPayment from "@/components/orders/AwaitPayment";

export const metadata: Metadata = {
  title: "Ďakujeme za objednávku | rozsvieťTO",
  robots: { index: false },
};

// Where the customer lands once the order is in: back from Stripe after
// paying by card, or straight from the cart after choosing a bank transfer or
// an order with installation. It thanks them, says plainly where the order
// stands, and what happens next — and for a transfer it is where the payment
// details are.
//
// Whether an order is paid is read from the row, which only the verified
// Stripe webhook writes; the redirect decides nothing.

type Props = { params: Promise<{ id: string }> };

export default async function ThankYouPage({ params }: Props) {
  const session = await getUserSession();
  if (!session) redirect("/prihlasenie");

  const { id } = await params;
  const group = await getOrderGroup(id);
  if (!group || group.userId !== session.userId) notFound();
  const orders = await listOrdersForGroup(id);

  const no = group.id.split("-")[0].toUpperCase();
  const paid = group.paymentStatus === "paid";
  const installation = group.deliveryMethod === INSTALLATION_METHOD;
  const quote = quoteState(group);
  const card = group.paymentMethod === "card";
  const transfer = group.paymentMethod === "transfer";
  const waitingForCard = card && !paid && group.paymentStatus !== "failed";
  const bank = transfer && !paid ? bankAccount() : null;
  const vs = orders[0] ? variableSymbol(orders[0].id) : null;

  const status = paid
    ? { tone: "ok" as const, title: "Platba prebehla", text: `Zaplatili ste ${formatEur(group.totalCents / 100)}. Ďakujeme!` }
    : quote === "requested"
      ? { tone: "info" as const, title: "Pripravíme cenovú ponuku", text: "Objednávka s montážou nevyžaduje platbu vopred. Pošleme vám cenovú ponuku s montážou a ozveme sa telefonicky." }
      : waitingForCard
        ? { tone: "wait" as const, title: "Platbu overujeme…", text: "Potvrdenie od banky zvyčajne príde do pár sekúnd. Stránka sa obnoví sama." }
        : group.paymentStatus === "failed"
          ? { tone: "warn" as const, title: "Platba neprebehla", text: "Nič sme vám nestrhli. Objednávku máme uloženú a zaplatiť ju môžete znova v detaile objednávky." }
          : transfer
            ? { tone: "info" as const, title: "Čakáme na platbu prevodom", text: "Pošlite prosím sumu na účet nižšie. Výrobu začneme hneď, ako platba príde." }
            : { tone: "info" as const, title: "Objednávku sme prijali", text: "Ozveme sa vám s potvrdením ceny, termínu a platby." };

  const tones = {
    ok:   { bg: "#f0fdf4", border: "#bbf7d0", fg: "#166534" },
    wait: { bg: "#fffbeb", border: "#fde68a", fg: "#92400e" },
    warn: { bg: "#fef2f2", border: "#fecaca", fg: "#991b1b" },
    info: { bg: "var(--color-surface)", border: "var(--color-border)", fg: "var(--color-foreground)" },
  }[status.tone];

  const steps = [
    { Icon: Mail, text: `Potvrdenie objednávky sme poslali na ${group.customerEmail}.` },
    installation
      ? { Icon: Wrench, text: quote === "requested" ? "Pripravíme cenovú ponuku s montážou. Po jej úhrade začneme vyrábať." : "Po prijatí platby začneme vyrábať a termín montáže dohodneme telefonicky." }
      : { Icon: Clock, text: `${PRODUCTION_TIME} Výrobu začneme po prijatí platby.` },
    ...(installation ? [] : [{ Icon: Package, text: afterMadeText(group.deliveryMethod) }]),
  ];

  const where = installation
    ? deliveryPlace(group)
    : [DELIVERY_METHOD_LABEL[group.deliveryMethod], deliveryPlace(group)].filter(Boolean).join(" — ");

  return (
    <main className="px-5 py-14 md:py-20" style={{ background: "var(--color-background)" }}>
      {waitingForCard && <AwaitPayment />}
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <span
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "var(--accent)", color: "#000" }}
            aria-hidden="true"
          >
            <CheckCircle2 size={34} strokeWidth={2.2} />
          </span>
          <h1 className="main-heading mt-5 text-3xl md:text-4xl" style={{ color: "var(--color-foreground)" }}>
            Ďakujeme za objednávku!
          </h1>
          <p className="mt-3 text-[15px]" style={{ color: "var(--color-muted)" }}>
            Číslo objednávky <strong style={{ color: "var(--color-foreground)" }}>{no}</strong>
          </p>
        </div>

        <div
          role="status"
          className="mt-8 rounded-3xl px-5 py-4"
          style={{ background: tones.bg, border: `1px solid ${tones.border}`, color: tones.fg }}
        >
          <p className="text-[16px] font-extrabold">{status.title}</p>
          <p className="mt-1 text-[14px] leading-6">{status.text}</p>
        </div>

        {bank && vs && (
          <dl
            className="mt-4 space-y-2 rounded-3xl p-5 text-sm"
            style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}
          >
            <p className="mb-1 text-[14px] font-extrabold" style={{ color: "#111" }}>Platobné údaje</p>
            <Row label="Suma" value={formatEur(group.totalCents / 100)} />
            <Row label="IBAN" value={bank.iban} />
            {bank.bic && <Row label="BIC / SWIFT" value={bank.bic} />}
            <Row label="Variabilný symbol" value={vs} />
            <Row label="Príjemca" value={bank.holder} />
            <Row label="Správa pre príjemcu" value={`Objednávka ${no}`} />
          </dl>
        )}

        <section className="mt-8">
          <h2 className="text-[15px] font-extrabold" style={{ color: "var(--color-foreground)" }}>Čo bude nasledovať</h2>
          <ol className="mt-3 space-y-2.5">
            {steps.map(({ Icon, text }, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-2xl px-4 py-3"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--color-background)", border: "1px solid var(--color-border-strong)" }}
                  aria-hidden="true"
                >
                  <Icon size={15} strokeWidth={2.2} />
                </span>
                <span className="text-[14px] leading-6" style={{ color: "var(--color-foreground-soft)" }}>{text}</span>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="mt-8 rounded-3xl p-5"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <h2 className="text-[15px] font-extrabold" style={{ color: "var(--color-foreground)" }}>Súhrn</h2>
          <ul className="mt-3 space-y-2">
            {orders.map((o) => (
              <li key={o.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold" style={{ color: "var(--color-foreground)" }}>
                    {oneLine(o.config.text) || "Váš nápis"}
                  </p>
                  <p className="text-[12.5px]" style={{ color: "var(--color-muted)" }}>
                    {materialById(o.config.material).displayName} · {o.config.height} mm · {variantLabel(o.config)}
                  </p>
                </div>
                <span className="shrink-0 text-[14px] font-black" style={{ color: "var(--color-foreground)" }}>
                  {formatEur((o.priceCents ?? o.price * 100) / 100)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t pt-3 text-[13.5px]" style={{ borderColor: "var(--color-border)" }}>
            {where && <Row label={installation ? "Adresa inštalácie" : "Doprava"} value={where} />}
            {!installation && group.deliveryCents > 0 && <Row label="Cena dopravy" value={formatEur(group.deliveryCents / 100)} />}
            <div className="flex items-baseline justify-between pt-1">
              <dt className="font-bold" style={{ color: "var(--color-muted)" }}>
                {quote === "requested" ? "Za nápisy s DPH" : "Spolu s DPH"}
              </dt>
              <dd className="text-xl font-black" style={{ color: "var(--color-foreground)" }}>
                {formatEur(group.totalCents / 100)}
              </dd>
            </div>
          </dl>
        </section>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Link
            href={`/objednavka/${group.id}`}
            className="rounded-2xl px-6 py-3.5 text-sm font-bold transition hover:-translate-y-px"
            style={{ background: "var(--color-background)", color: "var(--color-foreground)", border: "2px solid var(--color-foreground)" }}
          >
            Detail objednávky
          </Link>
          <Link
            href="/#konfigurator"
            className="rounded-2xl px-6 py-3.5 text-sm font-black transition hover:-translate-y-px"
            style={{ background: "var(--accent)", color: "#000", border: "2px solid var(--accent)" }}
          >
            Navrhnúť ďalší nápis
          </Link>
        </div>

        <p className="mt-6 text-center text-[13px]" style={{ color: "var(--color-muted)" }}>
          Otázky? Napíšte na <a href="mailto:info@4frommedia.sk" className="font-semibold underline">info@4frommedia.sk</a> alebo
          zavolajte na <a href="tel:+421907907097" className="font-semibold underline">+421 907 907 097</a>.
        </p>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt style={{ color: "var(--color-muted)" }}>{label}</dt>
      <dd className="text-right font-semibold" style={{ color: "var(--color-foreground)" }}>{value}</dd>
    </div>
  );
}
