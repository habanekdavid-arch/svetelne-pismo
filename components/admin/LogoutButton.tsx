"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/prihlasenie");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="rounded-full px-5 py-2.5 text-[11px] font-black uppercase tracking-wide transition hover:opacity-80 disabled:opacity-60"
      style={{ color: "var(--color-foreground)", border: "1px solid var(--color-border)" }}
    >
      {loading ? "…" : "Odhlásiť sa"}
    </button>
  );
}
