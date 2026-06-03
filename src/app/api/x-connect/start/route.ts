import { NextResponse } from "next/server";

import { getRequestOrigin } from "@/lib/config";
import { errorResponse } from "@/lib/http";
import { rateLimitRequest } from "@/lib/rate-limit";
import { createXFlow, getXOAuthConfig } from "@/lib/x-oauth";

export const runtime = "nodejs";

// Begins X OAuth. Cookieless: PKCE state travels in the signed `state` param
// (survives embedded-webview redirects). No-op redirect home when X OAuth is
// not configured.
export async function GET(request: Request): Promise<NextResponse> {
  try {
    rateLimitRequest(request, "x-connect:start", { limit: 20, windowMs: 60_000 });
    const origin = getRequestOrigin(request);
    const config = getXOAuthConfig(origin);
    if (!config) {
      return NextResponse.redirect(`${origin}/?x=unavailable`);
    }

    const { authorizeUrl } = createXFlow("/");
    return NextResponse.redirect(authorizeUrl(config));
  } catch (error) {
    return errorResponse(error);
  }
}
