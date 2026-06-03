import postgres from "postgres";

import type { StoredProofClaim, CreateProofInput } from "@/lib/proofs";
import { ApiError } from "@/lib/http";

type ProofRow = {
  id: string;
  version: number;
  action: string;
  environment: string;
  draft_text: string;
  draft_hash: string;
  signal: string;
  signal_hash: string;
  proof_commitment: string;
  x_username: string | null;
  x_handle: string | null;
  tweet_id: string | null;
  nullifier_decimal: string;
  world_verified_at: Date;
  world_result_code: string | null;
  world_session_id: string | null;
  created_at: Date;
  updated_at: Date;
};

let sql: ReturnType<typeof postgres> | null = null;

function shouldRequireSsl(url: string): boolean {
  const hostname = new URL(url).hostname;
  return !["localhost", "127.0.0.1", "::1"].includes(hostname);
}

function getSql(): ReturnType<typeof postgres> {
  if (sql) return sql;
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new ApiError(503, "storage_error", "POSTGRES_URL is not configured.");
  }
  sql = postgres(url, {
    ssl: shouldRequireSsl(url) ? "require" : undefined,
    max: 5,
    idle_timeout: 20,
  });
  return sql;
}

function rowToProof(row: ProofRow): StoredProofClaim {
  return {
    id: row.id,
    version: 1,
    action: row.action,
    environment: row.environment as StoredProofClaim["environment"],
    draftText: row.draft_text,
    draftHash: row.draft_hash,
    signal: row.signal,
    signalHash: row.signal_hash,
    proofCommitment: row.proof_commitment,
    xUsername: row.x_username ?? undefined,
    xHandle: row.x_handle ?? undefined,
    tweetId: row.tweet_id ?? undefined,
    nullifierDecimal: row.nullifier_decimal,
    worldVerification: {
      verifiedAt: row.world_verified_at.toISOString(),
      resultCode: row.world_result_code ?? undefined,
      sessionId: row.world_session_id ?? undefined,
    },
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function pgReadAll(): Promise<StoredProofClaim[]> {
  try {
    const db = getSql();
    const rows = await db<ProofRow[]>`SELECT * FROM proofs ORDER BY created_at DESC LIMIT 1000`;
    return rows.map(rowToProof);
  } catch (error) {
    throw new ApiError(503, "storage_error", "Proof storage is unavailable.", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function pgCheckProofStorage(): Promise<void> {
  try {
    const db = getSql();
    await db`SELECT id FROM proofs LIMIT 1`;
  } catch (error) {
    throw new ApiError(503, "storage_error", "Proof storage is unavailable.", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function pgGetById(id: string): Promise<StoredProofClaim | null> {
  try {
    const db = getSql();
    const rows = await db<ProofRow[]>`SELECT * FROM proofs WHERE id = ${id} LIMIT 1`;
    return rows.length > 0 ? rowToProof(rows[0]) : null;
  } catch (error) {
    throw new ApiError(503, "storage_error", "Proof storage is unavailable.", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function pgGetByTweetId(tweetId: string): Promise<StoredProofClaim | null> {
  try {
    const db = getSql();
    const rows = await db<ProofRow[]>`SELECT * FROM proofs WHERE tweet_id = ${tweetId} LIMIT 1`;
    return rows.length > 0 ? rowToProof(rows[0]) : null;
  } catch (error) {
    throw new ApiError(503, "storage_error", "Proof storage is unavailable.", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function pgUpsertProof(
  input: CreateProofInput & { id: string; proofCommitment: string; now: string },
): Promise<{ proof: StoredProofClaim; createdNew: boolean }> {
  try {
    const db = getSql();
    const verifiedAt = new Date(input.worldVerification.verifiedAt);

    // One proof per tweet. The conflict update only applies when the SAME World
    // ID identity re-proves its own tweet; a different identity colliding on the
    // tweet returns no row, which we surface as 409 tweet_already_proven.
    const rows = await db<(ProofRow & { _inserted: boolean })[]>`
      INSERT INTO proofs (
        id, action, environment, draft_text, draft_hash, signal, signal_hash,
        proof_commitment, x_username, x_handle, tweet_id, nullifier_decimal,
        world_verified_at, world_result_code, world_session_id
      )
      VALUES (
        ${input.id}, ${input.action}, ${input.environment},
        ${input.draftText}, ${input.draftHash}, ${input.signal}, ${input.signalHash},
        ${input.proofCommitment}, ${input.xUsername ?? null}, ${input.xHandle ?? null},
        ${input.tweetId ?? null}, ${input.nullifierDecimal},
        ${verifiedAt}, ${input.worldVerification.resultCode ?? null}, ${input.worldVerification.sessionId ?? null}
      )
      ON CONFLICT (tweet_id) WHERE tweet_id IS NOT NULL DO UPDATE SET
        x_username = EXCLUDED.x_username,
        x_handle = EXCLUDED.x_handle,
        world_verified_at = EXCLUDED.world_verified_at,
        world_result_code = EXCLUDED.world_result_code,
        world_session_id = EXCLUDED.world_session_id,
        updated_at = NOW()
      WHERE proofs.nullifier_decimal = EXCLUDED.nullifier_decimal
      RETURNING *, (xmax = 0) AS _inserted
    `;

    if (rows.length === 0) {
      throw new ApiError(409, "tweet_already_proven", "This X post already has a VeriPost proof.");
    }

    const row = rows[0];
    return { proof: rowToProof(row), createdNew: row._inserted };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, "storage_error", "Proof storage is unavailable.", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
