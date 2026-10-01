import { getUserSession } from "@/lib/user-auth";
import { getAdminIdentity } from "@/lib/admin-auth";
import { getOrder } from "@/lib/orders";
import { getPreview } from "@/lib/order-previews.server";
import { checkPreviewToken } from "@/lib/preview-token.server";

export const runtime = "nodejs";

// The watermarked picture of one ordered sign — for the customer who ordered
// it and for the admin, and for Stripe with a signed link
// (lib/preview-token.server.ts), nobody else.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(Number(id));
  if (!order) return new Response("Not found", { status: 404 });

  const signed = checkPreviewToken(order.id, new URL(req.url).searchParams.get("t"));
  const admin = signed ? null : await getAdminIdentity();
  if (!signed && !admin) {
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
