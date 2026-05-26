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
  action: string;
  environment: WorldEnvironment;
  draftText: string;
  draftHash: string;
  signal: string;
  signalHash: string;
  xUsername?: string;
  nullifierDecimal: string;
  worldVerification: ProofClaim["worldVerification"];
};

const STORE_VERSION = 1;

export function getStorePath(): string {
  const configuredPath = process.env.HUMANX_DATA_FILE?.trim() || "proofs.json";
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
  return `hx_${randomBytes(10).toString("base64url")}`;
}

export function createProofCommitment(id: string, nullifierDecimal: string, draftHash: string): string {
  return createHash("sha256").update(`${STORE_VERSION}:${id}:${nullifierDecimal}:${draftHash}`).digest("hex");
}

export function toPublicProof(proof: StoredProofClaim | ProofClaim): PublicProof {
  const publicProof = { ...proof } as Partial<StoredProofClaim>;
  delete publicProof.nullifierDecimal;
  return publicProof as PublicProof;
}

export async function readProofStore(): Promise<ProofStore> {
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
  const store = await readProofStore();
  const now = new Date().toISOString();
  const duplicate = store.proofs.find(
    (proof) => proof.nullifierDecimal === input.nullifierDecimal && proof.draftHash === input.draftHash,
  );

  if (duplicate) {
    duplicate.updatedAt = now;
    duplicate.xUsername = input.xUsername;
    duplicate.worldVerification = input.worldVerification;
    await writeProofStore(store);
    return { proof: toPublicProof(duplicate), createdNew: false };
  }

  const id = createProofId();
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
  const store = await readProofStore();
  const proof = store.proofs.find((item) => item.id === id);
  return proof ? toPublicProof(proof) : null;
}
