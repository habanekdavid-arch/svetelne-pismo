"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Back from Stripe a moment before Stripe's own confirmation arrives: the
 * order is marked paid by the signed webhook, never by this redirect, and the
 * two race. The page asks again every few seconds for a short while, so the
 * "overujeme" state turns into "zaplatené" by itself.
 */
export default function AwaitPayment({ tries = 12, everyMs = 2500 }: { tries?: number; everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      router.refresh();
      if (n >= tries) clearInterval(t);
    }, everyMs);
    return () => clearInterval(t);
  }, [router, tries, everyMs]);
  return null;
}
