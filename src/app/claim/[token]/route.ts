import { NextRequest, NextResponse } from "next/server";
import { getAccountByClaimToken } from "@/lib/google/accounts";
import { CLAIM_COOKIE } from "@/lib/auth/claim";

export const runtime = "nodejs";
// Tenant-scoped: never prerender or cache this response.
export const dynamic = "force-dynamic";

/**
 * Start the claim: remember the token, then send the customer to sign in.
 *
 * The binding cannot happen here, because we do not yet know which Google
 * account they will choose. It also cannot happen after sign-in, because
 * sign-in is precisely what fails for an unrecognised email. So the token is
 * parked in a cookie and consumed during authentication, once the identity is
 * known.
 */
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params;

  // Check it up front so a bad link says so immediately, rather than sending
  // someone through Google only to fail on the way back.
  const account = await getAccountByClaimToken(token);
  const loginUrl = new URL("/login", req.url);

  if (!account) {
    loginUrl.searchParams.set("claim", "invalid");
    return NextResponse.redirect(loginUrl);
  }

  loginUrl.searchParams.set("claim", "ready");
  const response = NextResponse.redirect(loginUrl);
  response.cookies.set(CLAIM_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax", // must survive the redirect back from Google
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 30,
  });
  return response;
}
