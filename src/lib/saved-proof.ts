export type SavedPublicProof = {
  id: string;
  draftText: string;
  createdAt: string;
  proofCommitment: string;
  xUsername?: string;
};

export type SavedProofResult = {
  proof: SavedPublicProof;
  proofUrl: string;
  tweetIntentUrl: string;
  createdNew: boolean;
};

export function parseSavedProofResult(value: unknown, appOrigin: string): SavedProofResult | null {
  if (!value || typeof value !== "object") return null;

  const result = value as Partial<SavedProofResult>;
  const proof = normalizeProof(result.proof);
  if (!proof || typeof result.createdNew !== "boolean") return null;

  const proofUrl = normalizeSameOriginProofUrl(result.proofUrl, appOrigin);
  if (!proofUrl) return null;

  const tweetIntentUrl = normalizeMatchingXIntentUrl(result.tweetIntentUrl, proofUrl, proof.draftText);
  if (!tweetIntentUrl) return null;

  return {
    proof,
    proofUrl,
    tweetIntentUrl,
    createdNew: result.createdNew,
  };
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
    xUsername: typeof proof.xUsername === "string" ? proof.xUsername : undefined,
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

function normalizeMatchingXIntentUrl(value: unknown, proofUrl: string, postText: string): string | null {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value);
    if (
      url.origin !== "https://x.com" ||
      url.pathname !== "/intent/tweet" ||
      url.searchParams.get("url") !== proofUrl ||
      url.searchParams.get("text") !== postText
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}
