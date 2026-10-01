// Dates and times as people in Slovakia read them. Pages are rendered on
// Vercel's servers, which run in UTC — without the time zone an order placed
// at 14:05 would read 12:05.

const ZONE = "Europe/Bratislava";

/** "1. 10. 2026, 14:05" */
export function formatDateTime(iso: string | Date): string {
  return new Date(iso).toLocaleString("sk-SK", {
    timeZone: ZONE,
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "1. 10. 2026" */
export function formatDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("sk-SK", { timeZone: ZONE });
}
