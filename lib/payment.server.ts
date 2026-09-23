import "server-only";

import { bankAccount } from "@/lib/bank";
import { stripeConfigured } from "@/lib/stripe";
import type { PaymentMethodId } from "@/lib/payment-methods";

/** The ways an order can be paid right now — card first, as on vytlacto3d. */
export function availablePaymentMethods(): PaymentMethodId[] {
  const methods: PaymentMethodId[] = [];
  if (stripeConfigured()) methods.push("card");
  if (bankAccount()) methods.push("transfer");
  return methods;
}
