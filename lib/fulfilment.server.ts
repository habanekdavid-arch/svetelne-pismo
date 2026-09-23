import "server-only";

import {
  attachPacket,
  listOrdersForGroup,
  recordPacketError,
  type OrderGroup,
} from "@/lib/orders";
import { createPacket, packetaConfigured, splitName, PacketaError } from "@/lib/packeta";
import { estimateParcel, totalParcel } from "@/lib/shipping";
import { measureSign } from "@/lib/sign-metrics.server";

// What happens once an order is paid, however it was paid — by card (the
// Stripe webhook) or by transfer (confirmed in the admin).

/**
 * Hands the paid order to Packeta. A failure here must never fail the webhook:
 * the money has moved and the order is paid either way, so the reason is kept
 * on the order and the packet is created by hand from the admin.
 */
export async function createPacketFor(group: OrderGroup): Promise<void> {
  if (!group.deliveryMethod.startsWith("packeta")) return;
  if (!packetaConfigured()) {
    await recordPacketError(group.id, "Packeta nie je nakonfigurovaná — zásielku vytvorte ručne.");
    return;
  }

  try {
    const orders = await listOrdersForGroup(group.id);
    // Measured from the font again rather than estimated: this weight goes on
    // the label Packeta prints.
    const parcel = totalParcel(
      await Promise.all(
        orders.map(async (o) =>
          estimateParcel(o.config, await measureSign(o.config.text, o.config.font, o.config.height)),
        ),
      ),
    );
    const { name, surname } = splitName(group.customerName);

    const packet = await createPacket({
      recipient: {
        // Packeta wants a short, unique order number of our own — the first
        // block of the order's uuid is both.
        number: group.id.split("-")[0],
        name,
        surname,
        email: group.customerEmail,
        phone: group.customerPhone,
      },
      // Insured for what was paid, not for what it cost us to make.
      value: group.totalCents / 100,
      currency: group.currency,
      weightKg: parcel.weightKg,
      point: group.deliveryPoint,
      address: group.deliveryAddress,
      note: `Objednávka ${group.id.split("-")[0]}`,
    });

    await attachPacket(group.id, { id: packet.id, barcode: packet.barcode });
  } catch (err) {
    const message = err instanceof PacketaError ? err.message : String(err);
    console.error(`[packeta] zásielka pre ${group.id} zlyhala:`, message);
    await recordPacketError(group.id, message);
  }
}
