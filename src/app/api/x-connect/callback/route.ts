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

// Sets the verified-X session cookie on a 200 HTML response (not a 3xx) so the
// cookie is reliably stored — embedded/mobile webviews drop Set-Cookie on
// redirects — then navigates to the app via JS.
function connectedPage(target: string): string {
  const safe = JSON.stringify(target);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VeriPost</title><script>try{location.replace(${safe});}catch(e){location.href=${safe};}</script></head><body style="font-family:system-ui;padding:24px">Connecting your X account… <a href=${safe}>Continue</a></body></html>`;
}

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

    const response = new NextResponse(connectedPage(`${origin}${returnTo}?x=connected`), {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
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
