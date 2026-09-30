import Link from "next/link";

// Tabs across the top of every admin page.
const TABS = [
  { href: "/admin", label: "Objednávky", key: "orders" },
  { href: "/admin/pouzivatelia", label: "Používatelia", key: "users" },
  { href: "/admin/emaily", label: "E-maily", key: "emails" },
] as const;

export default function AdminNav({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <nav className="mb-8 flex flex-wrap gap-2" aria-label="Administrácia">
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className="rounded-full px-4 py-2 text-sm font-bold transition hover:opacity-80"
            style={
              on
                ? { background: "var(--accent)", color: "var(--accent-foreground)" }
                : { background: "var(--color-background)", color: "var(--color-foreground)", border: "1px solid var(--color-border)" }
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
