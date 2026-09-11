import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Only the customer account area needs a signed-in Clerk session.
// /admin is a deliberately separate auth system (Prisma AdminUser +
// password, see lib/admin-auth.ts) — Clerk never gates it; the page itself
// (and its Server Action) check the admin session cookie instead.
const isProtectedRoute = createRouteMatcher([
  "/moje-objednavky(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
