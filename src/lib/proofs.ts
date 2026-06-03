import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";

import type { WorldEnvironment } from "@/lib/config";
import { ApiError } from "@/lib/http";

export type ProofClaim = {
  id: string;
  version: 1;
  action: string;
  environment: WorldEnvironment;
  draftText: string;
  draftHash: string;
  signal: string;
  signalHash: string;
  proofCommitment: string;
  // The verified X post this proof is bound to. `xHandle` is the tweet author
  // (lowercased, no @); `tweetId` makes the proof one-to-one with a single post.
  // Older proofs created before tweet binding may omit these.
  xHandle?: string;
  tweetId?: string;
  xUsername?: string;
  nullifierDecimal: string;
  worldVerification: {
    verifiedAt: string;
    resultCode?: string;
    sessionId?: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type StoredProofClaim = ProofClaim;

export type PublicProof = Omit<ProofClaim, "nullifierDecimal">;

export type ProofStore = {
  proofs: StoredProofClaim[];
};

export type CreateProofInput = {
  // Optional pre-generated id so callers can know the proof URL before storage
  // (e.g. to embed it in the tweet they post on the user's behalf).
  id?: string;
  action: string;
  environment: WorldEnvironment;
  draftText: string;
  draftHash: string;
  signal: string;
  signalHash: string;
  xHandle?: string;
  tweetId?: string;
  xUsername?: string;
  nullifierDecimal: string;
  worldVerification: ProofClaim["worldVerification"];
};

const STORE_VERSION = 1;
const PROOF_ID_PATTERN = /^vp_[A-Za-z0-9_-]{1,80}$/;

export function getStorePath(): string {
  const configuredPath = process.env.VERIPOST_DATA_FILE?.trim() || "proofs.json";
  const fileName = configuredPath
    .replace(/\\/g, "/")
    .replace(/^(?:\.\/)?(?:\.data|data)\//, "")
    .replace(/^\/*/, "");

  if (!fileName || fileName.includes("..") || path.isAbsolute(fileName)) {
    return path.join(process.cwd(), ".data", "proofs.json");
  }

  return path.join(process.cwd(), ".data", fileName);
}

export function createProofId(): string {
  return `vp_${randomBytes(16).toString("base64url")}`;
}

export function isValidProofId(id: string): boolean {
  return PROOF_ID_PATTERN.test(id);
}

export function createProofCommitment(id: string, nullifierDecimal: string, draftHash: string): string {
  return createHash("sha256").update(`${STORE_VERSION}:${id}:${nullifierDecimal}:${draftHash}`).digest("hex");
}

export function toPublicProof(proof: StoredProofClaim | ProofClaim): PublicProof {
  const publicProof = { ...proof } as Partial<StoredProofClaim>;
  delete publicProof.nullifierDecimal;
  return publicProof as PublicProof;
}

function shouldUsePostgres(): boolean {
  return Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL);
}

export async function readProofStore(): Promise<ProofStore> {
  if (shouldUsePostgres()) {
    const { pgReadAll } = await import("@/lib/proofs-pg");
    return { proofs: await pgReadAll() };
  }

  const filePath = getStorePath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as ProofStore;
    return { proofs: Array.isArray(parsed.proofs) ? parsed.proofs : [] };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { proofs: [] };
    }

    throw new ApiError(503, "storage_error", "Proof storage is unavailable.");
  }
}

export async function writeProofStore(store: ProofStore): Promise<void> {
  if (shouldUsePostgres()) {
    throw new ApiError(500, "storage_error", "writeProofStore is not supported with Postgres; use createOrRefreshProof.");
  }

  const filePath = getStorePath();
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(tempPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
    throw new ApiError(503, "storage_error", "Proof storage is unavailable.", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function createOrRefreshProof(input: CreateProofInput): Promise<{
  proof: PublicProof;
  createdNew: boolean;
}> {
  const now = new Date().toISOString();

  if (shouldUsePostgres()) {
    const { pgUpsertProof } = await import("@/lib/proofs-pg");
    const id = input.id ?? createProofId();
    const commitment = createProofCommitment(id, input.nullifierDecimal, input.draftHash);
    const result = await pgUpsertProof({ ...input, id, proofCommitment: commitment, now });
    return { proof: toPublicProof(result.proof), createdNew: result.createdNew };
  }

  const store = await readProofStore();

  // One proof per tweet: a post can only be claimed once, and only refreshed by
  // the same World ID identity that first proved it.
  const duplicate = input.tweetId
    ? store.proofs.find((proof) => proof.tweetId === input.tweetId)
    : store.proofs.find(
        (proof) => proof.nullifierDecimal === input.nullifierDecimal && proof.draftHash === input.draftHash,
      );

  if (duplicate) {
    if (input.tweetId && duplicate.nullifierDecimal !== input.nullifierDecimal) {
      throw new ApiError(409, "tweet_already_proven", "This X post already has a VeriPost proof.");
    }
    duplicate.updatedAt = now;
    duplicate.xHandle = input.xHandle ?? duplicate.xHandle;
    duplicate.xUsername = input.xUsername ?? duplicate.xUsername;
    duplicate.worldVerification = input.worldVerification;
    await writeProofStore(store);
    return { proof: toPublicProof(duplicate), createdNew: false };
  }

  const id = input.id ?? createProofId();
  const proof: StoredProofClaim = {
    id,
    version: 1,
    action: input.action,
    environment: input.environment,
    draftText: input.draftText,
    draftHash: input.draftHash,
    signal: input.signal,
    signalHash: input.signalHash,
    proofCommitment: createProofCommitment(id, input.nullifierDecimal, input.draftHash),
    xHandle: input.xHandle,
    tweetId: input.tweetId,
    xUsername: input.xUsername,
    nullifierDecimal: input.nullifierDecimal,
    worldVerification: input.worldVerification,
    createdAt: now,
    updatedAt: now,
  };

  store.proofs.push(proof);
  await writeProofStore(store);
  return { proof: toPublicProof(proof), createdNew: true };
}

export async function getPublicProof(id: string): Promise<PublicProof | null> {
  if (!isValidProofId(id)) {
    return null;
  }

  if (shouldUsePostgres()) {
    const { pgGetById } = await import("@/lib/proofs-pg");
    const stored = await pgGetById(id);
    return stored ? toPublicProof(stored) : null;
  }

  const store = await readProofStore();
  const proof = store.proofs.find((item) => item.id === id);
  return proof ? toPublicProof(proof) : null;
}

export async function getPublicProofByTweetId(tweetId: string): Promise<PublicProof | null> {
  if (!/^\d{1,25}$/.test(tweetId)) return null;

  if (shouldUsePostgres()) {
    const { pgGetByTweetId } = await import("@/lib/proofs-pg");
    const stored = await pgGetByTweetId(tweetId);
    return stored ? toPublicProof(stored) : null;
  }

  const store = await readProofStore();
  // Newest matching proof wins if older un-bound duplicates somehow exist.
  const proof = [...store.proofs].reverse().find((item) => item.tweetId === tweetId);
  return proof ? toPublicProof(proof) : null;
}
