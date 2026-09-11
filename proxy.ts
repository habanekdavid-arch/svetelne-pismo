import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Anyone can browse the whole site anonymously — only these two areas need
// a signed-in Clerk session. /admin additionally checks the signed-in
// user's e-mail against ADMIN_EMAILS, but that check needs the full Clerk
// user object (not just the session), so it happens in app/admin/page.tsx
// itself rather than here.
const isProtectedRoute = createRouteMatcher([
  "/moje-objednavky(.*)",
  "/admin(.*)",
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
