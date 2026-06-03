import { NextResponse } from "next/server";

import { getRequestOrigin } from "@/lib/config";
import { errorResponse } from "@/lib/http";
import { rateLimitRequest } from "@/lib/rate-limit";
import {
  assertXState,
  createXSessionCookie,
  exchangeXCodeForAccount,
  getXOAuthConfig,
  parseXFlowCookie,
  X_FLOW_COOKIE,
  X_SESSION_COOKIE,
} from "@/lib/x-oauth";

export const runtime = "nodejs";

// Completes X OAuth: verifies PKCE state, exchanges the code for the verified
// account, and stores a short-lived signed verified-X session cookie.
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
    const cookieHeader = request.headers.get("cookie") ?? "";
    const flowCookie = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${X_FLOW_COOKIE}=`))
      ?.slice(X_FLOW_COOKIE.length + 1);

    const flow = parseXFlowCookie(flowCookie ? decodeURIComponent(flowCookie) : undefined);
    assertXState(flow.state, url.searchParams.get("state"));
    if (!code) {
      return NextResponse.redirect(`${origin}/?x=denied`);
    }

    const account = await exchangeXCodeForAccount(config, code, flow.codeVerifier);

    const response = NextResponse.redirect(`${origin}${flow.returnTo.startsWith("/") ? flow.returnTo : "/"}?x=connected`);
    response.cookies.set(X_SESSION_COOKIE, createXSessionCookie(account), {
      httpOnly: true,
      secure: origin.startsWith("https://"),
      sameSite: "lax",
      path: "/",
      maxAge: 3600,
    });
    response.cookies.delete(X_FLOW_COOKIE);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
