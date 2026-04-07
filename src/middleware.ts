export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    // Protect all app routes except landing, signup, auth, and webhooks
    "/((?!$|signup|login|api/auth|api/webhooks|_next|favicon).*)",
  ],
};
