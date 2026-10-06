import { getAdminIdentity } from "@/lib/admin-auth";
import { getLogoConsultationFile } from "@/lib/logo-consultations";

export const runtime = "nodejs";

// The logo a customer sent for a consultation (?file=logo), or the preview
// the configurator made of it (?file=preview) — for the admin only, always
// as a download: an uploaded SVG must never run on this site's origin.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminIdentity())) return new Response("Not found", { status: 404 });

  const { id } = await params;
  const which = new URL(req.url).searchParams.get("file") === "preview" ? "preview" : "logo";
  const file = Number.isInteger(Number(id))
    ? await getLogoConsultationFile(Number(id), which).catch(() => null)
    : null;
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
