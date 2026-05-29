import { createHash, randomBytes } from "node:crypto";

import postgres from "postgres";

const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!url) {
  throw new Error("POSTGRES_URL or DATABASE_URL is required.");
}

if (process.env.ALLOW_UNVERIFIED_DEMO_PROOF_INSERT !== "local-only") {
  throw new Error("Refusing to insert an unverified demo proof. Set ALLOW_UNVERIFIED_DEMO_PROOF_INSERT=local-only.");
}

const parsedUrl = new URL(url);
const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
if (!localHosts.has(parsedUrl.hostname)) {
  throw new Error("Refusing to insert an unverified demo proof into a non-local database.");
}

const sql = postgres(url, { ssl: false, max: 1 });
const id = `vp_demo_${randomBytes(5).toString("base64url")}`;
const draftHash = "a1b2c3d4" + "0".repeat(56);
const signal = "veripost:v1:" + draftHash;
const signalHash = "0x" + "b".repeat(64);
const nullifierDecimal = BigInt(`0x${randomBytes(16).toString("hex")}`).toString(10);
const commitment = createHash("sha256").update(`1:${id}:${nullifierDecimal}:${draftHash}`).digest("hex");
const draftText = "Just shipped VeriPost — verified-human proofs for X posts. Privacy preserved, identity proven.";

await sql`
  INSERT INTO proofs (
    id, action, environment, draft_text, draft_hash, signal, signal_hash,
    proof_commitment, x_username, nullifier_decimal,
    world_verified_at, world_result_code, world_session_id
  ) VALUES (
    ${id}, 'veripost-tweet-proof', 'production',
    ${draftText}, ${draftHash}, ${signal}, ${signalHash},
    ${commitment}, 'kentf', ${nullifierDecimal},
    NOW(), 'demo_unverified', NULL
  )
`;

console.log("INSERTED:", id);
await sql.end();
