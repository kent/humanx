import { NextResponse } from "next/server";

import {
  getRequestOrigin,
  getWorldServerConfig,
  hasProofStorageConfig,
  missingWorldConfig,
} from "@/lib/config";
import { MAX_POST_TEXT_LENGTH } from "@/lib/text";
import { isXOAuthConfigured, readXSessionCookie, X_SESSION_COOKIE } from "@/lib/x-oauth";

export const runtime = "nodejs";

export function GET(request: Request): NextResponse {
  const config = getWorldServerConfig(getRequestOrigin(request));
  const xConnectedHandle = readXSessionCookie(readCookie(request, X_SESSION_COOKIE))?.handle ?? null;

  return NextResponse.json({
    appId: config.appId,
    action: config.action,
    environment: config.environment,
    appUrl: config.appUrl,
    supportEmail: config.supportEmail,
    hasWorldConfig: missingWorldConfig(config).length === 0,
    hasProofStorageConfig: hasProofStorageConfig(),
    requiresXConnect: isXOAuthConfigured(),
    xConnectedHandle,
    maxPostTextLength: MAX_POST_TEXT_LENGTH,
  });
}

function readCookie(request: Request, name: string): string | undefined {
  const raw = request.headers.get("cookie") ?? "";
  const match = raw
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}
