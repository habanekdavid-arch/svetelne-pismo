"use client";

import { useTransition } from "react";
import { deleteUserAction } from "@/app/admin/actions";

/** Deletes a customer account; their orders stay in the admin. */
export default function DeleteUserButton({ userId, email }: { userId: string; email: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Naozaj odstrániť účet ${email}? Zákazník sa už neprihlási; jeho objednávky ostanú v administrácii.`)) return;
        startTransition(() => {
          deleteUserAction(userId);
        });
      }}
      className="text-[11px] font-semibold text-red-500 underline underline-offset-2 transition hover:text-red-700 disabled:opacity-50"
    >
      {pending ? "Odstraňujem…" : "Odstrániť účet"}
    </button>
  );
}
