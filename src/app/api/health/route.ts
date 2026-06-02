import { NextResponse } from "next/server";

import {
  getRequestOrigin,
  getWorldServerConfig,
  hasDatabaseProofStorageConfig,
  hasProofStorageConfig,
  missingWorldConfig,
} from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HealthPayload = {
  ok: boolean;
  checks: {
    worldConfig: boolean;
    proofStorageConfig: boolean;
    databaseConfigured: boolean;
    proofStorageReachable: boolean;
  };
};

let cachedPayload: { payload: HealthPayload; status: number; expiresAt: number } | null = null;

export async function GET(request: Request): Promise<NextResponse> {
  const now = Date.now();
  if (cachedPayload && cachedPayload.expiresAt > now) {
    return NextResponse.json(cachedPayload.payload, { status: cachedPayload.status });
  }

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
    worldConfig: missingWorldConfig(config).length === 0,
    proofStorageConfig: hasProofStorageConfig(),
    databaseConfigured,
    proofStorageReachable,
  };
  const ok = Object.values(checks).every(Boolean);

  const status = ok ? 200 : 503;
  const payload = { ok, checks };
  cachedPayload = { payload, status, expiresAt: now + 15_000 };

  return NextResponse.json(payload, { status });
}
