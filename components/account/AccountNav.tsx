"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { notifySessionChange } from "@/lib/session-client";

// Sidebar of the customer area. The active item is decided by an exact path
// match, not by prefix: "/ucet" is a prefix of "/ucet/objednavky", so a prefix
// test would light up both links at once.
const ITEMS = [
  { href: "/ucet", label: "Môj účet" },
  { href: "/ucet/objednavky", label: "Moje objednávky" },
] as const;

export default function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    notifySessionChange(); // so the header's account pill updates too
    router.replace("/");
    router.refresh();
  }

  return (
    <nav className="flex flex-col gap-2">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="rounded-2xl px-4 py-3 text-sm transition"
            style={
              active
                ? {
                    border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
                    background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                    color: "var(--color-foreground)",
                  }
                : {
                    border: "1px solid transparent",
                    color: "var(--color-foreground-soft)",
                  }
            }
          >
            {item.label}
          </Link>
        );
      })}

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="mt-2 rounded-2xl px-4 py-3 text-left text-sm transition hover:opacity-80 disabled:opacity-50"
        style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground-soft)" }}
      >
        {loggingOut ? "Odhlasujem…" : "Odhlásiť sa"}
      </button>
    </nav>
  );
}
