import { NextResponse } from "next/server";
import { z } from "zod";

import { ApiError, errorResponse } from "@/lib/http";
import { attachXPostUrl, getPublicProof } from "@/lib/proofs";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const patchSchema = z.object({
  editToken: z.string().min(1),
  xPostUrl: z.string().min(1),
});

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const proof = await getPublicProof(id);
    if (!proof) {
      throw new ApiError(404, "proof_not_found", "Proof not found.");
    }

    return NextResponse.json({ proof });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const body = patchSchema.parse(await request.json());
    const proof = await attachXPostUrl(id, body.editToken, body.xPostUrl);

    return NextResponse.json({ proof });
  } catch (error) {
    return errorResponse(error);
  }
}
