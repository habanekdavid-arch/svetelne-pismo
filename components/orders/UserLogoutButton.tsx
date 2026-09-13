"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { notifySessionChange } from "@/lib/session-client";

// Customer sign-out. It used to sit in the header next to the nav links;
// signing out is an account action, so it lives on the account page instead
// and the header keeps only the "Môj účet" pill that leads here.

export default function UserLogoutButton() {
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
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      className="account-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-50"
    >
      <LogOut size={15} strokeWidth={2} />
      {loggingOut ? "Odhlasujem…" : "Odhlásiť sa"}
    </button>
  );
}
