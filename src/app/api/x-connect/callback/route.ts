import { NextResponse } from "next/server";

import { getRequestOrigin } from "@/lib/config";
import { errorResponse } from "@/lib/http";
import { rateLimitRequest } from "@/lib/rate-limit";
import { putPendingXConnection } from "@/lib/x-connect-store";
import {
  createXSessionCookie,
  exchangeXCodeForAccount,
  getXOAuthConfig,
  parseXFlowState,
} from "@/lib/x-oauth";

export const runtime = "nodejs";

// Runs in whatever browser X redirected to (often the system browser). It can't
// set the mini app's cookie directly (different context), so it stashes the
// verified-X session under the one-time link code; the mini app claims it via
// /api/x-connect/status. Shows a "return to World App" page.
function returnToAppPage(): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VeriPost</title></head><body style="font-family:system-ui;padding:32px;text-align:center"><h2>X account connected</h2><p>Return to VeriPost in World App — it will finish automatically.</p><script>try{window.close();}catch(e){}</script></body></html>`;
}

export async function GET(request: Request): Promise<NextResponse> {
  const origin = getRequestOrigin(request);
  try {
    rateLimitRequest(request, "x-connect:callback", { limit: 30, windowMs: 60_000 });
    const config = getXOAuthConfig(origin);
    if (!config) {
      return NextResponse.redirect(`${origin}/?x=unavailable`);
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const { codeVerifier, linkCode } = parseXFlowState(url.searchParams.get("state"));
    if (!code) {
      return NextResponse.redirect(`${origin}/?x=denied`);
    }

    const account = await exchangeXCodeForAccount(config, code, codeVerifier);
    await putPendingXConnection(linkCode, createXSessionCookie(account));

    return new NextResponse(returnToAppPage(), {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
