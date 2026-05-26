import { NextResponse } from "next/server";

import { getRequestOrigin, getWorldServerConfig, hasWorldVerificationConfig, hasXLoginConfig } from "@/lib/config";
import { MAX_POST_TEXT_LENGTH } from "@/lib/text";

export const runtime = "nodejs";

export function GET(request: Request): NextResponse {
  const config = getWorldServerConfig(getRequestOrigin(request));

  return NextResponse.json({
    appId: config.appId,
    action: config.action,
    environment: config.environment,
    appUrl: config.appUrl,
    supportEmail: config.supportEmail,
    hasWorldConfig: hasWorldVerificationConfig(config),
    hasXAuthConfig: hasXLoginConfig(),
    maxPostTextLength: MAX_POST_TEXT_LENGTH,
  });
}
