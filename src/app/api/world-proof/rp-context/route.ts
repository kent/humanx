import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getRequestOrigin,
  getWorldServerConfig,
} from "@/lib/config";
import { errorResponse } from "@/lib/http";
import { rateLimitRequest } from "@/lib/rate-limit";
import { assertJsonRequest, assertSameOriginRequest } from "@/lib/request-security";
import { validatePostText } from "@/lib/text";
import { createWorldIdKitRpContext } from "@/lib/world-idkit-server";
import {
  WORLD_MINIAPP_AUTH_FLOW,
  WORLD_MINIAPP_AUTH_HEADER,
} from "@/lib/world-miniapp-auth";

export const runtime = "nodejs";

const rpContextRequestSchema = z.object({
  draftText: z.string(),
}).strict();

export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOriginRequest(request, {
      allowMissingProvenanceHeader: {
        name: WORLD_MINIAPP_AUTH_HEADER,
        value: WORLD_MINIAPP_AUTH_FLOW,
      },
    });
    assertJsonRequest(request, 16_384);
    rateLimitRequest(request, "world-idkit:rp-context", { limit: 20, windowMs: 60_000 });

    const body = rpContextRequestSchema.parse(await request.json());
    const text = validatePostText(body.draftText);
    if (!text.ok) {
      return NextResponse.json({
        error: {
          code: text.code,
          message: text.message,
        },
      }, { status: 400 });
    }

    const config = getWorldServerConfig(getRequestOrigin(request));
    return NextResponse.json({
      rpContext: createWorldIdKitRpContext(config),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
