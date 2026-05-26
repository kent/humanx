import type { IDKitResult, RpContext } from "@worldcoin/idkit";
import { signRequest } from "@worldcoin/idkit/signing";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex } from "@noble/hashes/utils.js";

import type { WorldServerConfig } from "@/lib/config";
import { missingWorldConfig } from "@/lib/config";
import { ApiError } from "@/lib/http";

const encoder = new TextEncoder();

export type WorldVerifyResponse = {
  success?: boolean;
  results?: Array<{
    identifier?: string;
    success?: boolean;
    nullifier?: string;
    code?: string;
    detail?: string;
  }>;
  action?: string;
  nullifier?: string;
  created_at?: string;
  environment?: string;
  session_id?: string;
  message?: string;
};

export type WorldVerification = {
  nullifierDecimal: string;
  verifiedAt: string;
  resultCode?: string;
  sessionId?: string;
};

export type IdKitPayload = IDKitResult & {
  action?: string;
  environment?: string;
  responses?: Array<{
    signal_hash?: string;
    nullifier?: string;
    session_nullifier?: string[];
  }>;
};

export function hashSignalToField(signal: string): string {
  const digest = keccak_256(encoder.encode(signal));
  const fieldValue = BigInt(`0x${bytesToHex(digest)}`) >> 8n;
  return `0x${fieldValue.toString(16).padStart(64, "0")}`;
}

export function createRpContext(config: WorldServerConfig, action: string): RpContext {
  const missing = missingWorldConfig(config);
  if (missing.length) {
    throw new ApiError(503, "configuration_error", "World ID verification is not configured.", {
      missing,
    });
  }

  if (action !== config.action) {
    throw new ApiError(400, "invalid_action", "This World ID action is not accepted.");
  }

  const signed = signRequest({
    action,
    signingKeyHex: config.rpSigningKey,
  });

  return {
    rp_id: config.rpId,
    nonce: signed.nonce,
    created_at: signed.createdAt,
    expires_at: signed.expiresAt,
    signature: signed.sig,
  };
}

export function assertIdKitSignal(payload: IdKitPayload, action: string, expectedSignalHash: string): void {
  if (payload.action && payload.action !== action) {
    throw new ApiError(400, "invalid_action", "The proof was created for a different action.");
  }

  const signalHashes = payload.responses?.map((response) => response.signal_hash?.toLowerCase()).filter(Boolean);
  if (!signalHashes?.includes(expectedSignalHash.toLowerCase())) {
    throw new ApiError(400, "signal_mismatch", "The proof does not match this post text.");
  }
}

export async function verifyWorldProof(
  config: WorldServerConfig,
  payload: IdKitPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<WorldVerification> {
  const missing = missingWorldConfig(config);
  if (missing.length) {
    throw new ApiError(503, "configuration_error", "World ID verification is not configured.", {
      missing,
    });
  }

  const response = await fetchImpl(`https://developer.world.org/api/v4/verify/${config.rpId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const verifierPayload = (await response.json().catch(() => ({}))) as WorldVerifyResponse;
  const successfulResult = verifierPayload.results?.find((result) => result.success);

  if (!response.ok || !verifierPayload.success || !successfulResult) {
    throw new ApiError(400, "world_verification_failed", "World ID verification failed.", {
      status: response.status,
      message: verifierPayload.message,
      results: verifierPayload.results,
    });
  }

  const nullifier = verifierPayload.nullifier ?? successfulResult.nullifier ?? extractNullifier(payload);
  if (!nullifier) {
    throw new ApiError(400, "missing_nullifier", "World ID verification did not return a nullifier.");
  }

  return {
    nullifierDecimal: nullifierToDecimal(nullifier),
    verifiedAt: verifierPayload.created_at ?? new Date().toISOString(),
    resultCode: successfulResult.code,
    sessionId: verifierPayload.session_id,
  };
}

export function extractNullifier(payload: IdKitPayload): string | undefined {
  for (const response of payload.responses ?? []) {
    if (response.nullifier) return response.nullifier;
    if (response.session_nullifier?.[0]) return response.session_nullifier[0];
  }
  return undefined;
}

export function nullifierToDecimal(nullifier: string): string {
  if (/^0x[0-9a-fA-F]+$/.test(nullifier)) {
    return BigInt(nullifier).toString(10);
  }

  if (/^[0-9]+$/.test(nullifier)) {
    return nullifier;
  }

  throw new ApiError(400, "invalid_nullifier", "World ID verification returned an invalid nullifier.");
}
