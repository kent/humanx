CREATE TABLE IF NOT EXISTS proofs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  environment TEXT NOT NULL,
  draft_text TEXT NOT NULL,
  draft_hash TEXT NOT NULL,
  signal TEXT NOT NULL,
  signal_hash TEXT NOT NULL,
  proof_commitment TEXT NOT NULL,
  x_username TEXT,
  nullifier_decimal TEXT NOT NULL,
  world_verified_at TIMESTAMPTZ NOT NULL,
  world_result_code TEXT,
  world_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS proofs_nullifier_draft_hash_idx
  ON proofs (nullifier_decimal, draft_hash);

CREATE INDEX IF NOT EXISTS proofs_created_at_idx
  ON proofs (created_at DESC);
