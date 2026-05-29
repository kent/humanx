import { NextResponse } from "next/server";

import {
  getRequestOrigin,
  getWorldServerConfig,
  hasDatabaseProofStorageConfig,
  hasProofStorageConfig,
  hasWorldVerificationConfig,
  hasXLoginConfig,
} from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const config = getWorldServerConfig(getRequestOrigin(request));
  const databaseConfigured = hasDatabaseProofStorageConfig();
  let proofStorageReachable = !databaseConfigured;

  if (databaseConfigured) {
    try {
      const { pgCheckProofStorage } = await import("@/lib/proofs-pg");
      await pgCheckProofStorage();
      proofStorageReachable = true;
    } catch {
      proofStorageReachable = false;
    }
  }

  const checks = {
    worldConfig: hasWorldVerificationConfig(config),
    xAuthConfig: hasXLoginConfig(),
    proofStorageConfig: hasProofStorageConfig(),
    databaseConfigured,
    proofStorageReachable,
  };
  const ok = Object.values(checks).every(Boolean);

  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}
