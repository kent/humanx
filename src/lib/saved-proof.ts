import { normalizePostText } from "@/lib/text";
import { normalizeXUsername } from "@/lib/x";
import { parseTweetUrl } from "@/lib/x-tweet";

export type SavedPublicProof = {
  id: string;
  draftText: string;
  createdAt: string;
  proofCommitment: string;
  xUsername?: string;
  xHandle?: string;
  tweetId?: string;
};

export type SavedProofResult = {
  proof: SavedPublicProof;
  proofUrl: string;
  tweetUrl: string;
  createdNew: boolean;
};

export function parseSavedProofResult(value: unknown, appOrigin: string): SavedProofResult | null {
  if (!value || typeof value !== "object") return null;

  const result = value as Partial<SavedProofResult>;
  const proof = normalizeProof(result.proof);
  if (!proof || typeof result.createdNew !== "boolean") return null;

  const proofUrl = normalizeSameOriginProofUrl(result.proofUrl, appOrigin);
  if (!proofUrl) return null;

  const tweetUrl = normalizeTweetUrl(result.tweetUrl);
  if (!tweetUrl) return null;

  return {
    proof,
    proofUrl,
    tweetUrl,
    createdNew: result.createdNew,
  };
}

export function isSavedProofVisibleForDraft(
  proofResult: SavedProofResult | null,
  draftText: string,
): proofResult is SavedProofResult {
  if (!proofResult) return false;

  const normalizedDraft = normalizePostText(draftText);
  return !normalizedDraft || normalizedDraft === proofResult.proof.draftText;
}

function normalizeProof(value: unknown): SavedPublicProof | null {
  if (!value || typeof value !== "object") return null;

  const proof = value as Partial<SavedPublicProof>;
  if (
    typeof proof.id !== "string" ||
    typeof proof.draftText !== "string" ||
    typeof proof.createdAt !== "string" ||
    typeof proof.proofCommitment !== "string"
  ) {
    return null;
  }

  return {
    id: proof.id,
    draftText: proof.draftText,
    createdAt: proof.createdAt,
    proofCommitment: proof.proofCommitment,
    xUsername: normalizeXUsername(proof.xUsername) ?? undefined,
    xHandle: typeof proof.xHandle === "string" ? proof.xHandle : undefined,
    tweetId: typeof proof.tweetId === "string" ? proof.tweetId : undefined,
  };
}

function normalizeSameOriginProofUrl(value: unknown, appOrigin: string): string | null {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value, appOrigin);
    if (url.origin !== appOrigin || !url.pathname.startsWith("/proof/")) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function normalizeTweetUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const parsed = parseTweetUrl(value);
  if (!parsed) return null;
  return `https://x.com/${parsed.handle}/status/${parsed.tweetId}`;
}
