import { hashSignal } from "@worldcoin/idkit-core/hashing";
import { signRequest } from "@worldcoin/idkit-core/signing";
import type { RpContext } from "@worldcoin/idkit-core";
import { z } from "zod";

import { missingWorldConfig, type WorldServerConfig } from "@/lib/config";
import { ApiError } from "@/lib/http";

export type WorldIdKitVerification = {
  nullifierDecimal: string;
  resultCode: string;
  verifiedAt: string;
};

type VerifyWorldIdKitProofOptions = {
  fetcher?: typeof fetch;
};

const idKitResponseItemSchema = z.object({
  identifier: z.string().trim().min(1).max(120),
  signal_hash: z.string().trim().optional(),
  nullifier: z.string().trim().optional(),
}).passthrough();

const idKitResultBaseSchema = z.object({
  nonce: z.string().trim().min(1).max(180),
  action: z.string().trim().min(1).max(120).optional(),
  environment: z.string().trim().min(1).max(40),
  responses: z.array(idKitResponseItemSchema).min(1).max(8),
  user_presence_completed: z.boolean().optional(),
}).passthrough();

export const idKitResultSchema = z.discriminatedUnion("protocol_version", [
  idKitResultBaseSchema.extend({
    protocol_version: z.literal("3.0"),
  }),
  idKitResultBaseSchema.extend({
    protocol_version: z.literal("4.0"),
    session_id: z.string().trim().optional(),
  }),
]);

type ParsedIdKitResult = z.infer<typeof idKitResultSchema>;

export function createWorldIdKitRpContext(config: WorldServerConfig): RpContext {
  assertWorldIdKitServerConfig(config);

  const signature = signRequest({
    action: config.action,
    signingKeyHex: config.rpSigningKey,
    ttl: 180,
  });

  return {
    rp_id: config.rpId,
    nonce: signature.nonce,
    created_at: signature.createdAt,
    expires_at: signature.expiresAt,
    signature: signature.sig,
  };
}

export async function verifyWorldIdKitProof(
  config: WorldServerConfig,
  idkitResponse: unknown,
  signal: string,
  options: VerifyWorldIdKitProofOptions = {},
): Promise<WorldIdKitVerification> {
  assertWorldIdKitServerConfig(config);

  const parsedResponse = idKitResultSchema.parse(idkitResponse);
  assertExpectedWorldIdKitRequest(config, parsedResponse, signal);

  const fetcher = options.fetcher ?? fetch;
  let verifierResponse: Response;
  try {
    verifierResponse = await fetcher(`https://developer.world.org/api/v4/verify/${encodeURIComponent(config.rpId)}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(parsedResponse),
    });
  } catch (error) {
    throw new ApiError(503, "world_id_verifier_unavailable", "World ID proof verification is unavailable.", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  const verifierPayload = await verifierResponse.json().catch(() => null) as unknown;
  if (!verifierResponse.ok || verifierPayloadIsFailure(verifierPayload)) {
    throw new ApiError(403, "world_id_proof_invalid", "World ID proof could not be verified.", {
      verifierStatus: verifierResponse.status,
      verifierCode: getVerifierPayloadCode(verifierPayload),
    });
  }

  return {
    nullifierDecimal: hexToDecimal(getPrimaryNullifier(parsedResponse)),
    verifiedAt: new Date().toISOString(),
    resultCode: getWorldIdKitResultCode(parsedResponse),
  };
}

function assertWorldIdKitServerConfig(config: WorldServerConfig): void {
  const missing = missingWorldConfig(config);
  if (missing.length > 0) {
    throw new ApiError(503, "configuration_error", "World ID proof verification is not configured.", {
      missing,
    });
  }

  if (!config.rpId.startsWith("rp_")) {
    throw new ApiError(503, "configuration_error", "World ID RP ID is not configured.");
  }
}

function assertExpectedWorldIdKitRequest(
  config: WorldServerConfig,
  parsedResponse: ParsedIdKitResult,
  signal: string,
): void {
  if ("session_id" in parsedResponse && parsedResponse.session_id) {
    throw new ApiError(400, "unsupported_world_id_proof", "Session proofs cannot create VeriPost post proofs.");
  }

  if (parsedResponse.action !== config.action) {
    throw new ApiError(400, "world_id_action_mismatch", "World ID proof was created for a different action.");
  }

  if (parsedResponse.environment !== config.environment) {
    throw new ApiError(400, "world_id_environment_mismatch", "World ID proof was created for a different environment.");
  }

  const expectedSignalHash = hashSignal(signal).toLowerCase();
  for (const response of parsedResponse.responses) {
    if (response.signal_hash?.toLowerCase() !== expectedSignalHash) {
      throw new ApiError(400, "world_id_signal_mismatch", "World ID proof was created for a different post.");
    }
  }

  getPrimaryNullifier(parsedResponse);
}

function getPrimaryNullifier(parsedResponse: ParsedIdKitResult): string {
  const nullifier = parsedResponse.responses[0]?.nullifier;
  if (!nullifier || !/^0x[0-9a-f]+$/i.test(nullifier)) {
    throw new ApiError(400, "world_id_nullifier_missing", "World ID proof did not include a valid nullifier.");
  }

  return nullifier;
}

function verifierPayloadIsFailure(payload: unknown): boolean {
  return Boolean(toRecord(payload)?.success === false);
}

function getVerifierPayloadCode(payload: unknown): string | undefined {
  const record = toRecord(payload);
  const code = record?.code ?? record?.error_code ?? record?.error;
  if (typeof code !== "string" || !/^[a-z0-9_-]{1,80}$/i.test(code)) return undefined;
  return code;
}

function getWorldIdKitResultCode(parsedResponse: ParsedIdKitResult): string {
  const identifier = parsedResponse.responses[0]?.identifier.replace(/[^a-z0-9_-]/gi, "_").slice(0, 40) ||
    "unknown";
  const protocolVersion = parsedResponse.protocol_version === "3.0" ? "v3" : "v4";
  return `world_idkit_${protocolVersion}_${identifier}`;
}

function hexToDecimal(value: string): string {
  return BigInt(value).toString(10);
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}
