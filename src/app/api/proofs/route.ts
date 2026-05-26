import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { getRequestOrigin, getWorldServerConfig } from "@/lib/config";
import { ApiError, errorResponse } from "@/lib/http";
import { createOrRefreshProof } from "@/lib/proofs";
import { buildXIntentUrl } from "@/lib/x";
import { validatePostText } from "@/lib/text";
import { assertIdKitSignal, hashSignalToField, type IdKitPayload, verifyWorldProof } from "@/lib/world";

export const runtime = "nodejs";

const requestSchema = z.object({
  draftText: z.string(),
  idkitResponse: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new ApiError(401, "x_login_required", "Login with X before posting.");
    }

    const xUsername = session.user.username?.trim();
    if (!xUsername) {
      throw new ApiError(401, "x_username_required", "Login with X again before posting.");
    }

    const body = requestSchema.parse(await request.json());
    const text = validatePostText(body.draftText);
    if (!text.ok) {
      throw new ApiError(400, text.code, text.message);
    }

    const config = getWorldServerConfig(getRequestOrigin(request));
    const signalHash = hashSignalToField(text.signal);
    const idkitPayload = body.idkitResponse as unknown as IdKitPayload;

    assertIdKitSignal(idkitPayload, config.action, signalHash);

    const worldVerification = await verifyWorldProof(config, idkitPayload);
    const result = await createOrRefreshProof({
      action: config.action,
      environment: config.environment,
      draftText: text.normalized,
      draftHash: text.draftHash,
      signal: text.signal,
      signalHash,
      xUsername,
      nullifierDecimal: worldVerification.nullifierDecimal,
      worldVerification: {
        verifiedAt: worldVerification.verifiedAt,
        resultCode: worldVerification.resultCode,
        sessionId: worldVerification.sessionId,
      },
    });

    const proofUrl = `${config.appUrl}/proof/${result.proof.id}`;

    return NextResponse.json({
      proof: result.proof,
      proofUrl,
      tweetIntentUrl: buildXIntentUrl(text.normalized, proofUrl),
      createdNew: result.createdNew,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
