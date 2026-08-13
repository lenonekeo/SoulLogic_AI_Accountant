import { withAuth } from "next-auth/middleware";

// Public marketing / entry pages.
const PUBLIC_PATHS = ["/", "/login", "/signup"];

// Routes that carry their own authentication and must not be session-gated:
// NextAuth itself, the Vercel crons (CRON_SECRET) and the Stripe webhook
// (signature verification). Session-gating these makes the crons silently
// redirect to sign-in and never run.
const SELF_AUTHENTICATED_PREFIXES = ["/api/auth", "/api/cron", "/api/webhooks"];

export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      const { pathname } = req.nextUrl;
      if (PUBLIC_PATHS.includes(pathname)) return true;
      if (SELF_AUTHENTICATED_PREFIXES.some((p) => pathname.startsWith(p))) return true;
      return !!token;
    },
  },
});

// Everything else — pages and API routes alike — runs through the check above.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
