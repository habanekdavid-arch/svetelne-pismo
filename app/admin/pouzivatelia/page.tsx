import type { Metadata } from "next";
import { formatDate } from "@/lib/dates";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminIdentity } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { listUserProfiles, type Address, type UserProfile } from "@/lib/profile";
import { listUnverified } from "@/lib/email-verification.server";
import { listAllOrders, type Order } from "@/lib/orders";
import { formatEur } from "@/lib/vat";
import AdminNav from "@/components/admin/AdminNav";
import VerifyUserButton from "@/components/admin/VerifyUserButton";
import DeleteUserButton from "@/components/admin/DeleteUserButton";
import { Label } from "@/components/admin/OrderBits";

export const metadata: Metadata = {
  title: "Používatelia | rozsvieťTO",
  robots: { index: false, follow: false },
};

// Every registered customer account with what they filled in — contact,
// company details, both addresses, whether the e-mail is confirmed — and
// their orders. Newest accounts first; ?q= filters by name, e-mail, phone,
// company or IČO.
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getAdminIdentity();
  // Only a signed-in account listed in ADMIN_EMAILS gets in; anyone else
  // sees an ordinary 404, as if there were no admin at all.
  if (!session) notFound();

  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim().toLowerCase();

  const [users, profiles, unverified, orders] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" } }) as Promise<
      { id: string; name: string; email: string; createdAt: Date }[]
    >,
    listUserProfiles().catch(() => new Map<string, UserProfile>()),
    listUnverified().catch(() => new Set<string>()),
    listAllOrders().catch(() => [] as Order[]),
  ]);

  const ordersByUser = new Map<string, Order[]>();
  for (const o of orders) {
    const list = ordersByUser.get(o.userId) ?? [];
    list.push(o);
    ordersByUser.set(o.userId, list);
  }

  const shown = q
    ? users.filter((u) => {
        const p = profiles.get(u.id);
        return [u.name, u.email, p?.phone, p?.companyName, p?.ico]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      })
    : users;

  return (
    <main className="min-h-screen px-5 py-12" style={{ background: "var(--color-surface)" }}>
      <div className="mx-auto max-w-7xl">
        <AdminNav active="users" />

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="section-heading text-3xl sm:text-4xl" style={{ color: "var(--color-foreground)" }}>
              Používatelia
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              {users.length} registrovaných · {users.length - unverified.size} s overeným e-mailom
            </p>
          </div>
          <form className="flex gap-2" action="/admin/pouzivatelia">
            <input
              name="q"
              defaultValue={rawQ ?? ""}
              placeholder="Hľadať meno, e-mail, telefón, firmu, IČO…"
              className="w-72 rounded-full px-4 py-2 text-sm outline-none"
              style={{ background: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
            />
            <button
              type="submit"
              className="rounded-full px-4 py-2 text-sm font-bold"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              Hľadať
            </button>
          </form>
        </div>

        {shown.length === 0 ? (
          <p
            className="rounded-3xl border p-10 text-center text-sm"
            style={{ background: "var(--color-background)", borderColor: "var(--color-border)", color: "var(--color-muted)" }}
          >
            {q ? "Nikto nezodpovedá hľadaniu." : "Zatiaľ nie sú žiadni registrovaní používatelia."}
          </p>
        ) : (
          <div className="space-y-4">
            {shown.map((u) => {
              const p = profiles.get(u.id);
              const theirs = ordersByUser.get(u.id) ?? [];
              const spent = theirs.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + o.price, 0);
              const company = p?.accountType === "COMPANY";
              return (
                <article
                  key={u.id}
                  id={u.id}
                  className="scroll-mt-24 rounded-3xl border px-6 py-5 text-sm shadow-sm target:ring-2 target:ring-[#FFAE00]"
                  style={{ background: "var(--color-background)", borderColor: "var(--color-border)", color: "var(--color-foreground-soft)" }}
                >
                  <div className="grid gap-6 lg:grid-cols-[1.2fr_1.2fr_1fr_1fr]">
                    <div className="min-w-0">
                      <p className="text-lg font-extrabold" style={{ color: "var(--color-foreground)" }}>{u.name}</p>
                      <a href={`mailto:${u.email}`} className="block truncate underline">{u.email}</a>
                      {p?.phone && (
                        <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="block underline">{p.phone}</a>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Chip tone={unverified.has(u.id) ? "warn" : "ok"}>
                          {unverified.has(u.id) ? "E-mail neoverený" : "E-mail overený"}
                        </Chip>
                        {unverified.has(u.id) && <VerifyUserButton userId={u.id} />}
                        <Chip>{company ? "Firma" : p?.soleTrader ? "Živnostník" : "Súkromná osoba"}</Chip>
                      </div>
                      <p className="mt-2 text-xs" style={{ color: "var(--color-muted)" }}>
                        Registrovaný {formatDate(u.createdAt)}
                      </p>
                      <div className="mt-2">
                        <DeleteUserButton userId={u.id} email={u.email} />
                      </div>
                    </div>

                    <div className="min-w-0">
                      {company || p?.soleTrader ? (
                        <>
                          <Label>Firemné údaje</Label>
                          {company && <p className="font-semibold" style={{ color: "var(--color-foreground)" }}>{p?.companyName || "—"}</p>}
                          <p>IČO: {p?.ico || "—"}</p>
                          <p>DIČ: {p?.dic || "—"}</p>
                          {p?.vatPayer && <p>IČ DPH: {p.icDph || "—"}</p>}
                        </>
                      ) : (
                        <>
                          <Label>Fakturačná adresa</Label>
                          <AddressText address={p?.billing} fallback="Rovnaká ako dodacia" />
                        </>
                      )}
                    </div>

                    <div className="min-w-0">
                      {(company || p?.soleTrader) && (
                        <div className="mb-3">
                          <Label>Fakturačná adresa</Label>
                          <AddressText address={p?.billing} fallback="Rovnaká ako dodacia" />
                        </div>
                      )}
                      <Label>Dodacia adresa</Label>
                      <AddressText address={p?.shipping} />
                    </div>

                    <div className="min-w-0">
                      <Label>Objednávky</Label>
                      <p className="font-semibold" style={{ color: "var(--color-foreground)" }}>
                        {theirs.length} {theirs.length === 1 ? "nápis" : theirs.length >= 2 && theirs.length <= 4 ? "nápisy" : "nápisov"}
                        {spent > 0 && <> · {formatEur(spent)}</>}
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {theirs.slice(0, 5).map((o) => (
                          <li key={o.id}>
                            <Link href={`/admin/objednavka/${o.id}`} className="text-xs underline">
                              {o.number} — {formatDate(o.createdAt)}
                            </Link>
                          </li>
                        ))}
                        {theirs.length > 5 && (
                          <li className="text-xs" style={{ color: "var(--color-muted)" }}>a ďalšie {theirs.length - 5}</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: "ok" | "warn" }) {
  const cls =
    tone === "ok"
      ? "border-green-200 bg-green-50 text-green-700"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${cls}`}
      style={tone ? undefined : { borderColor: "var(--color-border)", color: "var(--color-muted)" }}
    >
      {children}
    </span>
  );
}

function AddressText({ address, fallback }: { address?: Address; fallback?: string }) {
  if (!address || !(address.street || address.city || address.zip)) {
    return <p style={{ color: "var(--color-muted)" }}>{fallback ?? "—"}</p>;
  }
  return (
    <p className="leading-6">
      {address.street}
      <br />
      {address.zip} {address.city}
      {address.country ? `, ${address.country}` : ""}
    </p>
  );
}
