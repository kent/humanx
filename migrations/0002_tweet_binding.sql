-- Bind each proof to the specific X post (tweet) it attests, and make a proof
-- one-to-one with a tweet. Identity moves from (nullifier, draft_hash) to the
-- tweet itself.

ALTER TABLE proofs ADD COLUMN IF NOT EXISTS x_handle TEXT;
ALTER TABLE proofs ADD COLUMN IF NOT EXISTS tweet_id TEXT;

-- Old uniqueness (one proof per identity+text) is superseded by one-per-tweet.
DROP INDEX IF EXISTS proofs_nullifier_draft_hash_idx;

-- One proof per tweet (NULLs allowed for pre-binding rows).
CREATE UNIQUE INDEX IF NOT EXISTS proofs_tweet_id_key
  ON proofs (tweet_id)
  WHERE tweet_id IS NOT NULL;
