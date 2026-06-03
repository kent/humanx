import { NextResponse } from "next/server";

import { getRequestOrigin } from "@/lib/config";
import { errorResponse } from "@/lib/http";
import { rateLimitRequest } from "@/lib/rate-limit";
import {
  createXSessionCookie,
  exchangeXCodeForAccount,
  getXOAuthConfig,
  parseXFlowState,
  X_SESSION_COOKIE,
} from "@/lib/x-oauth";

export const runtime = "nodejs";

// Completes X OAuth: verifies the signed PKCE state (CSRF + recovers the
// derived code_verifier), exchanges the code, and stores a short-lived signed
// verified-X session cookie. No flow cookie required.
export async function GET(request: Request): Promise<NextResponse> {
  const origin = getRequestOrigin(request);
  try {
    rateLimitRequest(request, "x-connect:callback", { limit: 20, windowMs: 60_000 });
    const config = getXOAuthConfig(origin);
    if (!config) {
      return NextResponse.redirect(`${origin}/?x=unavailable`);
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const { codeVerifier, returnTo } = parseXFlowState(url.searchParams.get("state"));
    if (!code) {
      return NextResponse.redirect(`${origin}/?x=denied`);
    }

    const account = await exchangeXCodeForAccount(config, code, codeVerifier);

    const response = NextResponse.redirect(`${origin}${returnTo}?x=connected`);
    response.cookies.set(X_SESSION_COOKIE, createXSessionCookie(account), {
      httpOnly: true,
      secure: origin.startsWith("https://"),
      sameSite: "lax",
      path: "/",
      maxAge: 3600,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
