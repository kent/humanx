import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

import { ApiError } from "@/lib/http";

// A binding nonce is a stateless, HMAC-authenticated token the server issues
// ONLY after it has verified (via oEmbed) that tweet `tweetId` by `@xHandle`
// contains text hashing to `draftHash`. The World ID proof's signal is derived
// from this token, so the zero-knowledge proof cryptographically commits the
// verified human to *this* post by *this* account — not just to some text.

const NONCE_TTL_MS = 10 * 60 * 1000; // 10 minutes to complete the World ID step
const NONCE_VERSION = "v2";

export type ProofBindingFacts = {
  draftHash: string;
  xHandle: string; // lowercased, no leading @
  tweetId: string;
  // The X account id the handle resolves to. When X OAuth is configured this is
  // the OAuth-verified numeric user id (proves handle control); otherwise it
  // falls back to the handle (oEmbed-only binding).
  xUserId: string;
};

type NoncePayload = ProofBindingFacts & {
  v: typeof NONCE_VERSION;
  exp: number;
  rand: string;
};

function getBindingSecret(): string {
  const secret =
    process.env.VERIPOST_BINDING_SECRET?.trim() || process.env.WORLD_ID_RP_SIGNING_KEY?.trim();
  if (!secret) {
    throw new ApiError(503, "configuration_error", "Proof binding secret is not configured.", {
      missing: ["VERIPOST_BINDING_SECRET"],
    });
  }
  return secret;
}

function base64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function sign(body: string): string {
  return createHmac("sha256", getBindingSecret()).update(body).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const aBytes = Buffer.from(a);
  const bBytes = Buffer.from(b);
  if (aBytes.length !== bBytes.length) return false;
  return timingSafeEqual(aBytes, bBytes);
}

export function issueBindingNonce(facts: ProofBindingFacts, now: number = Date.now()): string {
  const payload: NoncePayload = {
    v: NONCE_VERSION,
    draftHash: facts.draftHash,
    xHandle: facts.xHandle,
    tweetId: facts.tweetId,
    xUserId: facts.xUserId,
    exp: now + NONCE_TTL_MS,
    rand: bytesToHex(randomBytes(12)),
  };
  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

// Verifies the token's HMAC + expiry AND that its sealed facts match the facts
// the caller independently derived from the submitted request. Throws ApiError
// on any mismatch so callers can surface a precise rejection.
// Verifies HMAC + expiry and that the sealed text/handle/tweet match what the
// caller derived from the request, then returns the sealed facts (including the
// authoritative, HMAC-protected xUserId) for storage.
export function verifyBindingNonce(
  token: string,
  expected: Pick<ProofBindingFacts, "draftHash" | "xHandle" | "tweetId">,
  now: number = Date.now(),
): ProofBindingFacts {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new ApiError(400, "proof_binding_invalid", "Proof binding token is malformed.");
  }
  const [body, mac] = parts;
  if (!safeEqual(mac, sign(body))) {
    throw new ApiError(400, "proof_binding_invalid", "Proof binding token signature is invalid.");
  }

  let payload: NoncePayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as NoncePayload;
  } catch {
    throw new ApiError(400, "proof_binding_invalid", "Proof binding token payload is unreadable.");
  }

  if (payload.v !== NONCE_VERSION) {
    throw new ApiError(400, "proof_binding_invalid", "Proof binding token version is unsupported.");
  }
  if (typeof payload.exp !== "number" || payload.exp < now) {
    throw new ApiError(400, "proof_binding_expired", "Proof binding token has expired. Restart the proof.");
  }
  if (
    !safeEqual(payload.draftHash, expected.draftHash) ||
    !safeEqual(payload.xHandle, expected.xHandle) ||
    !safeEqual(payload.tweetId, expected.tweetId)
  ) {
    throw new ApiError(400, "proof_binding_mismatch", "Proof binding does not match the submitted post.");
  }

  return {
    draftHash: payload.draftHash,
    xHandle: payload.xHandle,
    tweetId: payload.tweetId,
    xUserId: payload.xUserId ?? payload.xHandle,
  };
}

// The World ID signal. Derived solely from the (HMAC-sealed) binding nonce, so
// recomputing it server-side requires the exact token the client used.
export function buildBoundSignal(bindingNonce: string): string {
  return `veripost:v2:${bytesToHex(sha256(utf8ToBytes(bindingNonce)))}`;
}
