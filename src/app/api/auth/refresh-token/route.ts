import { getServerSession } from "next-auth";
import { ok, error } from "@/lib/utils/api-helpers";

export async function GET() {
  const session = await getServerSession();

  if (!session) {
    return error("Not authenticated. Sign in first at /login.", 401);
  }

  const refreshToken = (session as { refreshToken?: string }).refreshToken;

  if (!refreshToken) {
    return error(
      "No refresh token found. Sign out, then sign back in and approve all Gmail permissions when prompted.",
      400
    );
  }

  return ok({
    refreshToken,
    instructions:
      "Copy this value and set it as GMAIL_REFRESH_TOKEN in your .env.local and Vercel environment variables.",
  });
}
