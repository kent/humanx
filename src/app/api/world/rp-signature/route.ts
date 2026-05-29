import { NextResponse } from "next/server";
import { z } from "zod";

import { assertProofStorageConfig, getRequestOrigin, getWorldServerConfig } from "@/lib/config";
import { errorResponse } from "@/lib/http";
import { rateLimitRequest } from "@/lib/rate-limit";
import { assertSameOriginRequest } from "@/lib/request-security";
import { createRpContext } from "@/lib/world";

export const runtime = "nodejs";

const requestSchema = z.object({
  action: z.string().min(1),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOriginRequest(request);
    const body = requestSchema.parse(await request.json());
    rateLimitRequest(request, "world:rp-signature", { limit: 30, windowMs: 60_000 });
    assertProofStorageConfig();
    const config = getWorldServerConfig(getRequestOrigin(request));
    const rpContext = createRpContext(config, body.action);

    return NextResponse.json({
      app_id: config.appId,
      action: config.action,
      environment: config.environment,
      rp_context: rpContext,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
