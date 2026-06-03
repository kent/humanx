import { NextResponse } from "next/server";

import { getRequestOrigin } from "@/lib/config";
import { errorResponse } from "@/lib/http";
import { rateLimitRequest } from "@/lib/rate-limit";
import { takePendingXConnection } from "@/lib/x-connect-store";
import { readXSessionCookie, X_SESSION_COOKIE } from "@/lib/x-oauth";

export const runtime = "nodejs";

// The mini app polls this with its one-time link code. If the OAuth callback has
// stashed a session, claim it: set the verified-X session cookie on THIS
// (webview) response and report the connected handle. One-time use.
export async function GET(request: Request): Promise<NextResponse> {
  try {
    rateLimitRequest(request, "x-connect:status", { limit: 120, windowMs: 60_000 });
    const origin = getRequestOrigin(request);
    const linkCode = new URL(request.url).searchParams.get("code");
    if (!linkCode || !/^[A-Za-z0-9_-]{16,64}$/.test(linkCode)) {
      return NextResponse.json({ connected: false, reason: "bad_code" }, { status: 400 });
    }

    const sessionValue = await takePendingXConnection(linkCode);
    if (!sessionValue) {
      return NextResponse.json({ connected: false }, { headers: { "cache-control": "no-store" } });
    }

    const account = readXSessionCookie(sessionValue);
    if (!account) {
      return NextResponse.json({ connected: false }, { headers: { "cache-control": "no-store" } });
    }

    const response = NextResponse.json(
      { connected: true, handle: account.handle },
      { headers: { "cache-control": "no-store" } },
    );
    response.cookies.set(X_SESSION_COOKIE, sessionValue, {
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
