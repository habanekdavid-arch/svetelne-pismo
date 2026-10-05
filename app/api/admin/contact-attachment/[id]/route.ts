import { getAdminIdentity } from "@/lib/admin-auth";
import { getContactAttachment } from "@/lib/contact";

export const runtime = "nodejs";

// A file someone sent through the contact form — for the admin only, always
// as a download, never rendered in the browser (an uploaded SVG or HTML-ish
// file must not run on this site's origin).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminIdentity())) return new Response("Not found", { status: 404 });

  const { id } = await params;
  const file = Number.isInteger(Number(id)) ? await getContactAttachment(Number(id)).catch(() => null) : null;
  if (!file) return new Response("Not found", { status: 404 });

  const ascii = file.filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  return new Response(new Uint8Array(file.content), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
