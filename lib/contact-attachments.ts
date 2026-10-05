// What the contact form accepts as attachments — shared by the form (to say
// no before uploading) and app/api/contact (to say no for real).
//
// The whole request goes through one Vercel function, whose body limit is
// 4.5 MB, so the files together stay under 4 MB with room for the text.

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENTS_BYTES = 4 * 1024 * 1024;

/** File types a sign enquiry actually comes with — pictures, drawings, documents. */
export const ATTACHMENT_EXTENSIONS = [
  // pictures and photos of the wall
  "jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "bmp", "tif", "tiff",
  // logos and drawings
  "svg", "pdf", "ai", "eps", "cdr", "dxf", "dwg", "psd",
  // documents
  "doc", "docx", "xls", "xlsx", "odt", "ods", "txt", "rtf",
  // several files in one
  "zip",
] as const;

/** For the file picker's `accept`. */
export const ATTACHMENT_ACCEPT = ATTACHMENT_EXTENSIONS.map((e) => `.${e}`).join(",");

/** "JPG, PNG, PDF, AI, …" — for the hint under the field. */
export const ATTACHMENT_HINT = "obrázky (JPG, PNG, HEIC…), PDF, SVG, AI, EPS, CDR, DXF, DWG, PSD, Word, Excel, ZIP";

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot < 0 ? "" : filename.slice(dot + 1).toLowerCase();
}

export function isAllowedAttachment(filename: string): boolean {
  return (ATTACHMENT_EXTENSIONS as readonly string[]).includes(extensionOf(filename));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(/\.0$/, "").replace(".", ",")} MB`;
}
