import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserSession } from "@/lib/user-auth";
import { getUserProfile, EMPTY_PROFILE } from "@/lib/profile";
import { listOrdersForUser, orderCountLabel } from "@/lib/orders";
import AccountShell, { AccountSection } from "@/components/account/AccountShell";
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
    <AccountShell title="Môj účet" description="Tu nájdete svoje údaje, objednávky, ich stav a históriu.">
      <AccountSection
        eyebrow="Môj účet"
        title="Moje údaje"
        badge={
          <Link
            href="/ucet/objednavky"
            className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition hover:opacity-80"
            style={{ background: "var(--color-surface)", color: "var(--color-muted)" }}
          >
            {orderCountLabel(orders.length)}
          </Link>
        }
      >
        <AccountDetails name={session.name} email={session.email} initial={profile} />
      </AccountSection>
    </AccountShell>
  );
}
