import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminIdentity } from "@/lib/admin-auth";
import AdminNav from "@/components/admin/AdminNav";
import type { Order, OrderGroup } from "@/lib/orders";
import { INSTALLATION_METHOD } from "@/lib/payment-methods";
import {
  buildOrderPlaced,
  buildQuoteSent,
  buildPaymentReceived,
  buildPaymentFailed,
  buildOrderReady,
  buildOrderCancelled,
  buildRefunded,
  buildPasswordReset,
  buildVerifyEmail,
  buildShopNewOrder,
  buildShopPaid,
  buildShopContact,
  type BuiltMail,
} from "@/lib/emails.server";

export const metadata: Metadata = {
  title: "E-maily | Admin | rozsvieťTO",
  robots: { index: false },
};

// Every e-mail the shop can send, for every kind of order, rendered from the
// same builders that send them (lib/emails.server.ts) on made-up sample
// orders — so what is on this page is exactly what arrives. Nothing is sent.

const SIGNS: Order[] = [
  {
    id: 1042, userId: "ukazka", customerName: "Ján Vzorový", customerEmail: "jan@priklad.sk",
    config: {
      text: "KAVIAREŇ", font: "montserrat-extrabold", material: "alurol-upper", signType: "illuminated",
      lightMode: "front", lightColor: "#ffffff", bodyColor: "#0a0a0a", faceColor: "#f1f0ea", height: 400, rotation: 0,
    },
    price: 690, priceCents: 69000, groupId: "a1b2c3d4-0000", status: "new", createdAt: new Date().toISOString(),
  },
];

function group(over: Partial<OrderGroup>): OrderGroup {
  return {
    id: "a1b2c3d4-0000-0000-0000-000000000000",
    userId: "ukazka",
    customerName: "Ján Vzorový",
    customerEmail: "jan@priklad.sk",
    customerPhone: "+421 900 123 456",
    deliveryMethod: "dpd",
    deliveryPoint: null,
    deliveryAddress: { street: "Hlavná", houseNumber: "12", city: "Trenčín", zip: "911 01", country: "sk" },
    itemsCents: 69000,
    deliveryCents: 615,
    totalCents: 69615,
    currency: "EUR",
    paymentStatus: "unpaid",
    paymentMethod: "card",
    quoteSentAt: null,
    stripeSessionId: null,
    stripePaymentIntent: null,
    packetaPacketId: null,
    packetaBarcode: null,
    packetaError: null,
    createdAt: new Date().toISOString(),
    ...over,
  };
}

const PRIEVIDZA = { deliveryMethod: "pickup-prievidza", deliveryAddress: null, deliveryCents: 0, totalCents: 69000 };
const BRATISLAVA = {
  deliveryMethod: "pickup-bratislava",
  deliveryAddress: { street: "Obchodná", houseNumber: "5", city: "Bratislava", zip: "811 06", country: "sk" },
  deliveryCents: 0,
  totalCents: 69000,
};
const FREIGHT = { deliveryMethod: "freight", deliveryCents: 0, totalCents: 69000 };
const INSTALL = {
  deliveryMethod: INSTALLATION_METHOD,
  deliveryAddress: { street: "Nám. slobody", houseNumber: "1", city: "Prievidza", zip: "971 01", country: "sk" },
  paymentMethod: "transfer" as const,
  deliveryCents: 0,
  totalCents: 69000,
};

type Sample = { title: string; who: "zákazník" | "vy"; when: string; mail: BuiltMail };

function samples(): Sample[] {
  const paid = { paymentStatus: "paid" as const };
  return [
    { who: "zákazník", title: "Potvrdenie objednávky — platba kartou, kuriér DPD", when: "hneď po odoslaní objednávky", mail: buildOrderPlaced(group({}), SIGNS) },
    { who: "zákazník", title: "Potvrdenie objednávky — prevod, osobný odber Prievidza", when: "hneď po odoslaní objednávky; obsahuje platobné údaje", mail: buildOrderPlaced(group({ ...PRIEVIDZA, paymentMethod: "transfer" }), SIGNS) },
    { who: "zákazník", title: "Potvrdenie objednávky — prevod, osobný odber Bratislava", when: "hneď po odoslaní objednávky", mail: buildOrderPlaced(group({ ...BRATISLAVA, paymentMethod: "transfer" }), SIGNS) },
    { who: "zákazník", title: "Objednávka s montážou — prevod", when: "hneď po odoslaní objednávky s montážou; najprv sa platí za nápis", mail: buildOrderPlaced(group(INSTALL), SIGNS) },
    { who: "zákazník", title: "Objednávka s montážou — kartou", when: "hneď po odoslaní objednávky s montážou", mail: buildOrderPlaced(group({ ...INSTALL, paymentMethod: "card" }), SIGNS) },
    { who: "zákazník", title: "Cenová ponuka s montážou (staršie objednávky)", when: "len pri objednávkach s montážou z obdobia pred platbou vopred", mail: buildQuoteSent(group({ ...INSTALL, deliveryCents: 25000, totalCents: 94000, quoteSentAt: new Date().toISOString() }), SIGNS) },
    { who: "zákazník", title: "Platba prijatá — kuriér DPD", when: "po zaplatení kartou alebo po potvrdení prevodu v admine", mail: buildPaymentReceived(group(paid)) },
    { who: "zákazník", title: "Platba prijatá — osobný odber Prievidza", when: "po zaplatení", mail: buildPaymentReceived(group({ ...PRIEVIDZA, ...paid })) },
    { who: "zákazník", title: "Platba prijatá — osobný odber Bratislava", when: "po zaplatení", mail: buildPaymentReceived(group({ ...BRATISLAVA, ...paid })) },
    { who: "zákazník", title: "Platba prijatá — s montážou", when: "po zaplatení nápisu; ozveme sa kvôli montáži", mail: buildPaymentReceived(group({ ...INSTALL, ...paid })) },
    { who: "zákazník", title: "Platba neprebehla", when: "keď Stripe nahlási neúspešnú platbu", mail: buildPaymentFailed(group({ paymentStatus: "failed" })) },
    { who: "zákazník", title: "Nápis je hotový — osobný odber Prievidza", when: "keď v admine označíte všetky nápisy objednávky ako Hotovo", mail: buildOrderReady(group({ ...PRIEVIDZA, ...paid }), SIGNS) },
    { who: "zákazník", title: "Nápis je hotový — osobný odber Bratislava", when: "všetky nápisy Hotovo", mail: buildOrderReady(group({ ...BRATISLAVA, ...paid }), SIGNS) },
    { who: "zákazník", title: "Nápis je hotový — kuriér DPD", when: "všetky nápisy Hotovo", mail: buildOrderReady(group(paid), SIGNS) },
    { who: "zákazník", title: "Nápis je hotový — preprava na dohodu", when: "všetky nápisy Hotovo", mail: buildOrderReady(group({ ...FREIGHT, ...paid }), SIGNS) },
    { who: "zákazník", title: "Nápis je hotový — montáž", when: "všetky nápisy Hotovo", mail: buildOrderReady(group({ ...INSTALL, ...paid }), SIGNS) },
    { who: "zákazník", title: "Objednávka zrušená — nezaplatená", when: "keď v admine zrušíte všetky nápisy objednávky", mail: buildOrderCancelled(group({}), SIGNS) },
    { who: "zákazník", title: "Objednávka zrušená — už zaplatená", when: "zrušenie zaplatenej objednávky", mail: buildOrderCancelled(group(paid), SIGNS) },
    { who: "zákazník", title: "Platba vrátená", when: "keď v Stripe vrátite platbu (Refund)", mail: buildRefunded(group({ paymentStatus: "refunded" })) },
    { who: "zákazník", title: "Overenie e-mailu", when: "hneď po registrácii", mail: buildVerifyEmail("jan@priklad.sk", "Ján", "https://rozsvietto.sk/api/auth/verify?token=ukazka") },
    { who: "zákazník", title: "Obnovenie hesla", when: "Zabudnuté heslo", mail: buildPasswordReset("jan@priklad.sk", "https://rozsvietto.sk/obnova-hesla?token=ukazka") },
    { who: "vy", title: "Nová objednávka — platba kartou", when: "hneď po odoslaní objednávky", mail: buildShopNewOrder(group({}), SIGNS) },
    { who: "vy", title: "Nová objednávka — prevod", when: "hneď po odoslaní objednávky", mail: buildShopNewOrder(group({ ...PRIEVIDZA, paymentMethod: "transfer" }), SIGNS) },
    { who: "vy", title: "Nová objednávka s montážou", when: "hneď po odoslaní objednávky s montážou", mail: buildShopNewOrder(group(INSTALL), SIGNS) },
    { who: "vy", title: "Objednávka zaplatená — do výroby", when: "po zaplatení kartou alebo po potvrdení prevodu", mail: buildShopPaid(group(paid), SIGNS) },
    { who: "vy", title: "Objednávka s montážou zaplatená — kontaktovať zákazníka", when: "po zaplatení nápisu s montážou", mail: buildShopPaid(group({ ...INSTALL, ...paid }), SIGNS) },
    { who: "vy", title: "Kontaktný formulár", when: "keď niekto napíše cez kontaktný formulár", mail: buildShopContact({ name: "Ján Vzorový", email: "jan@priklad.sk", subject: "Cena nápisu", message: "Dobrý deň,\nkoľko by stál nápis KAVIAREŇ, 2 m?" }) },
  ];
}

export default async function EmailPreviewPage() {
  const session = await getAdminIdentity();
  if (!session) redirect("/admin/prihlasenie");
  const list = samples();

  return (
    <main className="px-5 py-10" style={{ background: "var(--color-background)" }}>
      <div className="mx-auto max-w-5xl">
        <AdminNav active="emails" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: "var(--color-foreground)" }}>E-maily</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
              Všetky e-maily, ktoré web posiela zákazníkom aj vám — na ukážkovej objednávke. Nič sa tu neodosiela.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-xl px-4 py-2 text-sm font-bold"
            style={{ border: "2px solid var(--color-foreground)", color: "var(--color-foreground)" }}
          >
            Späť do administrácie
          </Link>
        </div>

        <nav className="mt-6 grid gap-1 sm:grid-cols-2">
          {list.map((s, i) => (
            <a key={i} href={`#mail-${i}`} className="text-sm underline-offset-2 hover:underline" style={{ color: "var(--color-foreground-soft)" }}>
              <span className="font-bold">{s.who === "vy" ? "Vám" : "Zákazníkovi"}:</span> {s.title}
            </a>
          ))}
        </nav>

        <div className="mt-8 space-y-10">
          {list.map((s, i) => (
            <section key={i} id={`mail-${i}`} className="scroll-mt-24">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: s.who === "vy" ? "#b45309" : "var(--color-muted)" }}>
                {s.who === "vy" ? "Prichádza vám (info@4frommedia.sk)" : "Prichádza zákazníkovi"} · {s.when}
              </p>
              <h2 className="mt-1 text-lg font-extrabold" style={{ color: "var(--color-foreground)" }}>{s.title}</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
                Predmet: <strong style={{ color: "var(--color-foreground)" }}>{s.mail.subject}</strong>
              </p>
              <iframe
                title={s.title}
                srcDoc={s.mail.html}
                sandbox=""
                className="mt-3 h-[640px] w-full rounded-2xl"
                style={{ border: "1px solid var(--color-border)", background: "#f5f5f4" }}
              />
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
