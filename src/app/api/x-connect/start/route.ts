import { NextResponse } from "next/server";

import { getRequestOrigin } from "@/lib/config";
import { errorResponse } from "@/lib/http";
import { rateLimitRequest } from "@/lib/rate-limit";
import { createXFlow, getXOAuthConfig } from "@/lib/x-oauth";

export const runtime = "nodejs";

// Same-origin entry (so the in-app navigation guard allows it) that 307s to X.
// The mini app passes a one-time link code it generated; the OAuth result is
// later claimed with that code via /api/x-connect/status, so the verified-X
// session reaches the mini app webview even though OAuth runs in the system
// browser. No cookie is involved.
export async function GET(request: Request): Promise<NextResponse> {
  try {
    rateLimitRequest(request, "x-connect:start", { limit: 30, windowMs: 60_000 });
    const origin = getRequestOrigin(request);
    const config = getXOAuthConfig(origin);
    if (!config) {
      return NextResponse.redirect(`${origin}/?x=unavailable`);
    }

    const linkCode = new URL(request.url).searchParams.get("lc") ?? "";
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(linkCode)) {
      return NextResponse.redirect(`${origin}/?x=badcode`);
    }

    const { authorizeUrl } = createXFlow("/", linkCode);
    return NextResponse.redirect(authorizeUrl(config));
  } catch (error) {
    return errorResponse(error);
  }
}
