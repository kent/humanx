# Security Audit - 2026-05-29

Scope: VeriPost Next.js World Mini App, World ID/IDKit proof flow, X OAuth gate, proof storage, production API routes, dependency lockfile, and repository secret exposure.

No Solidity, Vyper, Foundry, Hardhat, Truffle, or Brownie contract artifacts were present in the repository at audit time. The audited web3 surface is the off-chain proof contract between the client, backend RP signature endpoint, World verifier, X OAuth identity, and proof persistence.

## Evidence

- `find . -maxdepth 4 \( -name '*.sol' -o -name '*.vy' -o -name 'foundry.toml' -o -name 'hardhat.config.*' -o -name 'truffle-config.*' -o -name 'brownie-config.*' -o -name 'remappings.txt' \) -print` returned no files.
- `pnpm audit --audit-level moderate` returned no known vulnerabilities.
- Manual secret pattern scan found only code references, examples, and docs placeholders.
- `pnpm outdated --format table` showed only `eslint` major-version drift after security dependency patching.
- `pnpm verify` passed locally after fixes.
- GitHub `CI`, `CodeQL`, and `OpenSSF Scorecard` passed on pushed commit `25401f7`.
- Production probes after deployment:
  - `POST /api/world/rp-signature` without `Origin` returned `403 missing_origin`.
  - Same-origin JSON `POST /api/world/rp-signature` returned a valid production RP context.
  - Non-JSON `POST /api/world/rp-signature` returned `415 unsupported_media_type`.
  - Invalid JSON shape returned `400 invalid_request` without diagnostic details.
  - `GET /api/health` returned `ok: true` with storage reachable.

## Findings Fixed

### Internal Error Detail Exposure

Production API errors returned diagnostic `details`, including possible verifier or storage internals. `errorResponse` now redacts Zod and `ApiError` details in production launch runtime.

### Weak Browser Provenance Checks

Production POST routes accepted requests with no `Origin` or `Referer`. Same-origin API POSTs now require browser provenance in production, reject cross-site Fetch Metadata, and still allow local/dev requests without those headers.

### Missing JSON And Body-Size Enforcement

Proof and RP-signature routes relied on JSON parsing failures after accepting arbitrary content types and lengths. They now require `application/json` and enforce per-route body caps before parsing.

### Unbounded World Verifier Call

World verifier requests had no timeout. Verification now uses a 10 second abort timeout.

### Session Proof Acceptance From Verifier Response

Client payload session proofs were rejected, but a verifier response containing `session_id` was not explicitly rejected. Verifier session proofs now fail closed.

### Oversized Nullifier Handling

Nullifier conversion accepted arbitrarily long decimal/hex strings. Nullifier length is now bounded before conversion/storage.

### Conditional Postgres TLS

Postgres TLS was required only for recognized URL patterns. Remote Postgres connections now require TLS by default; only localhost addresses are allowed without TLS. The migration script uses the same rule.

### Public Health Check DB Pressure

The public health route could query proof storage on every request. Health results are now cached briefly per runtime instance to reduce database pressure.

### Rate-Limit Key Pressure

Forwarded client IP identifiers were not bounded before use in in-memory rate-limit keys. Client IP identifiers are now capped and the in-memory bucket map has a fixed ceiling.

### Supply Chain Drift

Patch updates were applied for `@worldcoin/idkit`, `postgres`, `viem`, `wagmi`, and `lucide-react`. This also removed a non-registry `pkg.pr.new` transitive tarball for `ox` from the lockfile.

## Residual Risks

- Rate limiting is still in-memory and per runtime instance. It is useful friction but not a global abuse-control layer. A durable Redis/Postgres-backed limiter is the next hardening step if abuse appears.
- Public proof pages intentionally publish user-submitted post text. Operational moderation and deletion handling through `support@veripost.io` remains required.
- The final end-to-end iPhone World App test still requires a real production World ID account and X account.
- Static analysis tools such as `gitleaks`, `semgrep`, `osv-scanner`, and `trufflehog` were not installed locally; the audit used `pnpm audit`, GitHub CodeQL, OpenSSF Scorecard, manual route review, lockfile review, and targeted secret-pattern scanning.
