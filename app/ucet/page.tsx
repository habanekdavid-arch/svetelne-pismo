import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/user-auth";
import { getUserProfile, EMPTY_PROFILE } from "@/lib/profile";
import { listOrdersForUser } from "@/lib/orders";
import AccountShell from "@/components/account/AccountShell";
import AccountDetails from "@/components/account/AccountDetails";

export const metadata: Metadata = {
  title: "Môj účet | rozsvieťTO",
};

export default async function AccountPage() {
  const session = await getUserSession();
  if (!session) redirect("/prihlasenie");

  // Accounts created before registration collected any of this have no row
  // yet, so the page opens on an empty form rather than an error.
  const profile = (await getUserProfile(session.userId)) ?? EMPTY_PROFILE;
  const orders = await listOrdersForUser(session.userId);

  return (
    <AccountShell
      title="Môj účet"
      description="Tu nájdete svoje údaje, objednávky, ich stav a históriu."
    >
      {/* Sekcie si kreslí AccountDetails sám — v zobrazovacom režime sú to
          dlaždice s údajmi, po stlačení „Upraviť" jeden formulár. */}
      <AccountDetails
        name={session.name}
        email={session.email}
        initial={profile}
        ordersCount={orders.length}
      />
    </AccountShell>
  );
}
