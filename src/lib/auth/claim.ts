/**
 * Name of the short-lived cookie that carries a claim through the sign-in
 * round trip.
 *
 * Kept out of the route file because Next.js permits only its own set of
 * exports from a route module, and an extra one fails the build.
 */
export const CLAIM_COOKIE = "soullogic_claim";
