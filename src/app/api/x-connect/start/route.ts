import { NextResponse } from "next/server";

import { getRequestOrigin } from "@/lib/config";
import { errorResponse } from "@/lib/http";
import { rateLimitRequest } from "@/lib/rate-limit";
import { createXFlow, getXOAuthConfig, X_FLOW_COOKIE } from "@/lib/x-oauth";

export const runtime = "nodejs";

// Begins X OAuth: sets a signed PKCE flow cookie and redirects to X. No-op
// redirect home when X OAuth is not configured (oEmbed-only binding remains).
export async function GET(request: Request): Promise<NextResponse> {
  try {
    rateLimitRequest(request, "x-connect:start", { limit: 20, windowMs: 60_000 });
    const origin = getRequestOrigin(request);
    const config = getXOAuthConfig(origin);
    if (!config) {
      return NextResponse.redirect(`${origin}/?x=unavailable`);
    }

    const { authorizeUrl, cookieValue } = createXFlow("/");
    const response = NextResponse.redirect(authorizeUrl(config));
    response.cookies.set(X_FLOW_COOKIE, cookieValue, {
      httpOnly: true,
      secure: origin.startsWith("https://"),
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
