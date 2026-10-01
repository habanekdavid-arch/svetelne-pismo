import { getUserSession } from "@/lib/user-auth";
import { getAdminIdentity } from "@/lib/admin-auth";
import { getOrder } from "@/lib/orders";
import { getPreview } from "@/lib/order-previews.server";

export const runtime = "nodejs";

// The watermarked picture of one ordered sign — for the customer who ordered
// it and for the admin, nobody else.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(Number(id));
  if (!order) return new Response("Not found", { status: 404 });

  const admin = await getAdminIdentity();
  if (!admin) {
    const session = await getUserSession();
    if (!session || session.userId !== order.userId) return new Response("Not found", { status: 404 });
  }

  const image = await getPreview(order.id).catch(() => null);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="nahlad-${order.id}.jpg"`,
    },
  });
}
