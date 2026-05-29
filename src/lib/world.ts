import type { RpContext } from "@worldcoin/idkit";
import { signRequest } from "@worldcoin/idkit/signing";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex } from "@noble/hashes/utils.js";

import type { WorldEnvironment } from "@/lib/config";
import type { WorldServerConfig } from "@/lib/config";
import { missingWorldConfig } from "@/lib/config";
import { ApiError } from "@/lib/http";

const encoder = new TextEncoder();
const ACCEPTED_CREDENTIAL_IDENTIFIER = "proof_of_human";
const WORLD_VERIFY_TIMEOUT_MS = 10_000;
const MAX_NULLIFIER_HEX_CHARS = 128;
const MAX_NULLIFIER_DECIMAL_CHARS = 160;

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

export type IdKitPayload = {
  protocol_version?: string;
  nonce?: string;
  action?: string;
  action_description?: string;
  environment?: string;
  session_id?: string;
  responses?: Array<{
    identifier?: string;
    signal_hash?: string;
    proof?: string | string[];
    merkle_root?: string;
    nullifier?: string;
    session_nullifier?: string[];
    issuer_schema_id?: number;
    expires_at_min?: number;
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

export function assertIdKitSignal(
  payload: IdKitPayload,
  action: string,
  environment: WorldEnvironment,
  expectedSignalHash: string,
): void {
  if (payload.protocol_version !== "4.0") {
    throw new ApiError(400, "invalid_proof_type", "The proof response type is not accepted.");
  }

  if (payload.session_id) {
    throw new ApiError(400, "invalid_proof_type", "Session proofs cannot create post proofs.");
  }

  if (payload.action !== action) {
    throw new ApiError(400, "invalid_action", "The proof was created for a different action.");
  }

  if (payload.environment !== environment) {
    throw new ApiError(400, "invalid_environment", "The proof was created for a different environment.");
  }

  if (!Array.isArray(payload.responses) || payload.responses.length !== 1) {
    throw new ApiError(400, "invalid_proof_response", "The proof must contain exactly one credential response.");
  }

  const response = payload.responses[0];
  if (response.identifier !== ACCEPTED_CREDENTIAL_IDENTIFIER) {
    throw new ApiError(400, "invalid_credential", "The proof credential is not accepted.");
  }

  if (response.signal_hash?.toLowerCase() !== expectedSignalHash.toLowerCase()) {
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
    signal: AbortSignal.timeout(WORLD_VERIFY_TIMEOUT_MS),
  });

  const verifierPayload = (await response.json().catch(() => ({}))) as WorldVerifyResponse;
  const successfulResults = verifierPayload.results?.filter((result) => result.success) ?? [];

  if (!response.ok || !verifierPayload.success || successfulResults.length === 0) {
    throw new ApiError(400, "world_verification_failed", "World ID verification failed.", {
      status: response.status,
      message: verifierPayload.message,
      results: verifierPayload.results,
    });
  }

  if (successfulResults.length !== 1) {
    throw new ApiError(400, "ambiguous_world_verification", "World ID verification returned multiple successful proofs.", {
      results: verifierPayload.results,
    });
  }

  const successfulResult = successfulResults[0];
  if (verifierPayload.action && verifierPayload.action !== config.action) {
    throw new ApiError(400, "invalid_action", "World ID verified a different action.");
  }

  if (verifierPayload.environment && verifierPayload.environment !== config.environment) {
    throw new ApiError(400, "invalid_environment", "World ID verified a different environment.");
  }

  if (successfulResult.identifier !== ACCEPTED_CREDENTIAL_IDENTIFIER) {
    throw new ApiError(400, "invalid_credential", "World ID verified an unsupported credential.");
  }

  if (verifierPayload.session_id) {
    throw new ApiError(400, "invalid_proof_type", "World ID verified a session proof.");
  }

  const nullifier = verifierPayload.nullifier ?? successfulResult.nullifier;
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
  if (new TextEncoder().encode(nullifier).length > MAX_NULLIFIER_DECIMAL_CHARS + 2) {
    throw new ApiError(400, "invalid_nullifier", "World ID verification returned an invalid nullifier.");
  }

  if (/^0x[0-9a-fA-F]+$/.test(nullifier) && nullifier.length <= MAX_NULLIFIER_HEX_CHARS + 2) {
    return BigInt(nullifier).toString(10);
  }

  if (/^[0-9]+$/.test(nullifier) && nullifier.length <= MAX_NULLIFIER_DECIMAL_CHARS) {
    return nullifier;
  }

  throw new ApiError(400, "invalid_nullifier", "World ID verification returned an invalid nullifier.");
}
