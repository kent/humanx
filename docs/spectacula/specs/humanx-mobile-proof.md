# HumanX Mobile Proof Mini App Specification

Status: Implementation v1
Purpose: Define and build a mobile-first World Mini App that lets a verified human create a public proof link for an X post and publish that proof with the post.
Audience: Engineer, product reviewer, and app reviewer.

## 1. Overview and Goals

### 1.1 Problem Statement

HumanX should make it easy for a person to prove that a post they are sharing on X was authorized by a World ID verified human. The product goal is not to reveal the person's identity. It is to create a public, shareable attestation that says: "a verified human created this proof for this exact post text."

The app will run as a World Mini App. World documentation states that Mini Apps are web applications running inside the World App webview, and that World ID verification for Mini Apps has moved to IDKit. The implementation therefore uses a mobile-first Next.js app with MiniKit initialized for World App context and IDKit for World ID proof collection.

### 1.2 Goals

| Goal | Requirement |
|---|---|
| World-native mobile experience | The first screen is the usable compose flow, designed for World App webview constraints and mobile ergonomics. |
| X login gate | A user must login with X before a proof can be created for a post. |
| World ID proof | A user can verify with World ID through IDKit before a proof is issued. |
| Backend verification | The server generates RP signatures, forwards IDKit responses to the World Developer Portal verifier, and never trusts client-only proof state. |
| Exact post binding | The proof binds to a normalized post text hash through IDKit `signal`, and the backend checks the returned `signal_hash`. |
| Public proof | The app creates a durable, public proof page that can be included in an X post. |
| X publishing path | The app builds an X Web Intent URL containing the post text and proof URL, using same-window navigation for World App webview compatibility. |
| World App Store readiness | The implementation includes review-safe copy, MiniKit integration, metadata guidance, asset requirements, production deployment notes, and a submission checklist. |
| Verification loop | Project-native checks plus self-review against this spec are required before completion. |

### 1.3 Non-Goals

| Non-Goal | Reason |
|---|---|
| Final X post verification in v1 | X login gates proof creation, but X Web Intent does not return a posted tweet id to the app. |
| Automatic posting to X | Requires X API credentials and user OAuth consent. The app should be structured so OAuth can be added later. |
| On-chain proof publication | The current goal can be satisfied by backend verification and a public proof page. |
| Paid flows, tokens, rewards, or subscriptions | These are unrelated to the proof-of-human posting goal and create avoidable review/compliance risk. |
| Exposing wallet addresses | The app does not need wallet auth, so it should not display or depend on wallet addresses. |

## 2. Current State and Constraints

### 2.1 Repository State

The repository starts with only `GOALS.md`. There is no existing application, framework, package manager lockfile, database, or deployment configuration. This is a greenfield implementation.

### 2.2 External Documentation Constraints

| Source | Design Impact |
|---|---|
| World Mini Apps docs | Build as a web app running in World App, initialize MiniKit, and design for mobile webview behavior. |
| World ID / IDKit docs | Use IDKit 4.x, generate RP signatures on the backend, forward proof payloads as-is to `/api/v4/verify/{rp_id}`, and store/check nullifiers server-side. |
| World App guidelines | Mobile-first layout, no footers/sidebars/hamburger navigation, stable loading/error states, no World logo or "official" branding, reliable behavior on Android and iOS. |
| World Webview specs | Avoid popups/new windows; navigation remains in the current webview. Do not use blocking `alert()` flows. |
| X Web Intent docs | Use `https://x.com/intent/tweet` with pre-filled text/url. Web Intents do not require X app credentials but require user confirmation. |

### 2.3 Environment and Secrets

| Variable | Scope | Required | Description |
|---|---:|---:|---|
| `NEXT_PUBLIC_WORLD_APP_ID` | Client | Yes for real verification | World Developer Portal app id, `app_...`. |
| `WORLD_RP_ID` | Server | Yes for real verification | World ID 4.0 relying party id, `rp_...`. |
| `WORLD_RP_SIGNING_KEY` | Server | Yes for real verification | Secret signing key from Developer Portal. Never expose to client. |
| `WORLD_ID_ACTION` | Server/client derived | No | Defaults to `humanx-tweet-proof`. |
| `WORLD_ID_ENVIRONMENT` | Server/client derived | No | `production` by default, `staging` for simulator testing. |
| `NEXT_PUBLIC_APP_URL` | Server/client | Recommended | Absolute app origin for proof URLs. Falls back to request origin. |
| `NEXTAUTH_URL` | Server | Yes for production login | Production app origin for Auth.js redirects. |
| `NEXTAUTH_SECRET` | Server | Yes for X login | Server-only Auth.js session secret. |
| `X_CLIENT_ID` | Server | Yes for X login | X OAuth 2.0 client id. |
| `X_CLIENT_SECRET` | Server | Yes for X login | X OAuth 2.0 client secret. |
| `HUMANX_DATA_FILE` | Server | No | File-backed local proof store path. Defaults to `.data/proofs.json`. |
| `SUPPORT_EMAIL` | Server/client | Recommended for submission | Public support contact for World App Store review and user support. |

### 2.4 World App Store Review Constraints

The implementation must be ready for Developer Portal submission after production secrets and hosting are supplied.

| Requirement | HumanX Handling |
|---|---|
| App is complete, not a demo/beta | V1 must expose the full compose, verify, proof, and X-post flow. Missing env vars may block local verification, but production submission must include live IDKit verification. |
| Live IDKit or MiniKit integration | MiniKitProvider is installed at app root and proof issuance uses IDKit with backend verification. |
| Review team can access app | Deployment notes must document HTTPS URL, test flow, and required env vars. |
| Complete and accurate app information | Include suggested app name, short description, support email variable, icon/card asset requirements, and proof-flow description in `WORLD_APP_STORE.md`. |
| Mobile-first and reliable | Avoid footers, sidebars, hamburger menus, infinite loading, unsupported platform-only features, and popup-dependent flows. |
| Branding | Do not use the World logo, modified World logo, or the word "official" in app name, metadata, or UI. |
| Data consent | State what is stored before proof creation: post text, proof commitment, verification timestamp, and X username. Do not store personal identity data beyond the user-provided/authenticated posting context. |
| Platform compliance | No payments, gambling/chance mechanics, token presales, memberships/yield, or NFT purchase CTAs in v1. |
| Support | Provide a support contact for the app store listing. |

## 3. Scope and User Experience

### 3.1 Primary Flow

1. User opens HumanX in World App or a mobile browser preview.
2. User logs in with X.
3. User enters the post text and presses "Post".
4. Client requests an RP signature from `/api/world/rp-signature`.
5. User completes World ID verification through IDKit.
6. Client submits the IDKit result and draft text to `/api/proofs`.
7. Backend verifies the proof with World, checks the expected signal hash, stores the proof claim with the X username, and returns a public proof URL plus an X intent URL.
8. The app opens the X Web Intent in the same webview/window with the post text and proof URL.

### 3.2 Public Proof Page

The public proof page must show:

| Field | Public Display |
|---|---|
| Verification state | Verified human proof created at timestamp. |
| X login | Display the X username when available. |
| Post text | The exact normalized text the proof was created for. |
| Text digest | Short digest for tamper-evident comparison. |
| Proof id | HumanX proof id. |
| Privacy note | Explain that World ID verifies humanness without revealing identity. |

The page must not publicly display the full World ID nullifier. It may display a short proof commitment derived from the nullifier, proof id, and draft hash.

### 3.3 Mobile UI Requirements

| Area | Requirement |
|---|---|
| Layout | Single task-first screen with compact top status, compose area, proof result panel, and anchored primary action. |
| Navigation | Use simple tabs/segmented areas only when they reduce clutter. No sidebar, footer, or hamburger menu. |
| Spacing | Use 24px outer padding on mobile and clear 16/24/32px rhythms for grouped content. |
| Safe areas | Respect dynamic viewport height and bottom safe area. |
| Feedback | Use inline status/toast elements, not `alert()`. |
| Copy | Avoid "official World" phrasing. Use plain, globally understandable language. |
| Failure states | Show actionable errors for missing configuration, verification rejection, network failure, and invalid post URL. |

## 4. Domain Model and Contracts

### 4.1 Proof Claim

```ts
type ProofClaim = {
  id: string;
  version: 1;
  action: string;
  environment: "production" | "staging";
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
```

### 4.2 Proof Creation Response

```ts
type ProofCreationResponse = {
  proof: PublicProof;
  proofUrl: string;
  tweetIntentUrl: string;
};
```

### 4.3 Text Normalization

Post text is normalized before hashing:

1. Convert CRLF/CR to LF.
2. Trim leading/trailing whitespace.
3. Collapse runs of spaces/tabs within each line to one space.
4. Collapse more than two consecutive blank lines to two.

Empty text is invalid. Text longer than `220` characters is invalid in v1 so the proof URL can fit in an X post.

### 4.4 Signal Binding

The IDKit signal is:

```text
humanx:v1:<draftHash>
```

The backend computes:

```text
signalHash = hash_to_field(utf8(signal))
```

using World ID's documented hash-to-field algorithm: Keccak-256 of the input bytes, interpreted as a big-endian integer and shifted right by 8 bits. The backend compares the result to the first IDKit response `signal_hash`.

## 5. Backend Design

### 5.1 Routes

| Route | Method | Runtime | Purpose |
|---|---|---|---|
| `/api/world/rp-signature` | POST | Node.js | Validate action, generate RP signature with `WORLD_RP_SIGNING_KEY`, return `rp_context`. |
| `/api/proofs` | POST | Node.js | Verify IDKit result, create proof claim, return proof URL and X intent URL. |
| `/proof/[id]` | GET | Server page | Render public proof page. |

### 5.2 RP Signature Route

Input:

```json
{
  "action": "humanx-tweet-proof"
}
```

Validation:

| Check | Failure |
|---|---|
| `WORLD_RP_ID` missing | `503 configuration_error` |
| `WORLD_RP_SIGNING_KEY` missing | `503 configuration_error` |
| action does not equal configured action | `400 invalid_action` |

Output:

```json
{
  "app_id": "app_...",
  "action": "humanx-tweet-proof",
  "environment": "production",
  "rp_context": {
    "rp_id": "rp_...",
    "nonce": "0x...",
    "created_at": 1760000000,
    "expires_at": 1760000300,
    "signature": "0x..."
  }
}
```

### 5.3 Proof Creation Route

Input:

```json
{
  "draftText": "I am posting this with HumanX.",
  "idkitResponse": {}
}
```

Processing:

1. Validate app configuration.
2. Normalize and validate `draftText`.
3. Compute `draftHash`, `signal`, and `signalHash`.
4. Check the IDKit payload action matches `WORLD_ID_ACTION`.
5. Check at least one response has the expected `signal_hash`.
6. Forward the IDKit payload as-is to `https://developer.world.org/api/v4/verify/{WORLD_RP_ID}`.
7. Require an OK response and at least one successful proof result.
8. Extract nullifier from verifier response or IDKit payload.
9. Store proof claim. Prevent duplicate `(nullifierDecimal, draftHash)` claims.
10. Return public proof and X intent URL.

### 5.4 Storage

V1 uses a file-backed JSON store to keep the greenfield repo runnable without external services. The storage module must be isolated behind functions so it can be replaced with Postgres later.

Production deployment should replace the file store with a durable database. The logical unique index is:

```text
unique(nullifier_decimal, draft_hash)
```

## 6. Frontend Design

### 6.1 Framework

Use:

| Tool | Reason |
|---|---|
| Next.js App Router | World docs reference Next.js examples; supports colocated pages and route handlers. |
| React 19 | Current stable React ecosystem. |
| TypeScript strict mode | Safer contracts for proof payloads and route responses. |
| Tailwind CSS 4 | Fast, mobile-first styling with low runtime overhead. |
| MiniKit Provider | Initializes World Mini App context. |
| IDKit React | Current World ID integration path for React. |
| Vitest | Fast unit tests for hashing, validation, and URL generation. |

### 6.2 Compose Component States

| State | UI Behavior |
|---|---|
| `loading` | Configuration/session state is being fetched. |
| `ready` | X login, text entry, and the single Post action are available as configuration allows. |
| `signing_world` | Button disabled while the app requests an RP signature and opens IDKit. |
| `creating_proof` | Backend verification in progress. |
| `proof_ready` | Store the last proof locally and open X with the proof URL attached. |
| `error` | Inline error with retry path. |

### 6.3 X Intent Behavior

The tweet intent URL uses:

```text
https://x.com/intent/tweet?text=<encoded text>&url=<encoded proof url>
```

The app must navigate in the same window using `window.location.assign(tweetIntentUrl)` because World App webview restrictions prohibit opening new windows.

## 7. Security, Privacy, and Abuse Controls

| Risk | Control |
|---|---|
| Client fakes verification | Backend verifies IDKit proof with World Developer Portal. |
| Client changes post text after proof | Proof page shows normalized text and digest; signal hash is checked against the normalized text. |
| Leaked signing key | Signing key is server-only and must never be bundled into client code. |
| Nullifier public correlation | Do not expose full nullifier on proof pages. |
| Duplicate proof spam for same text by same human | Store unique `(nullifierDecimal, draftHash)`. |
| Misleading claim about X ownership | UI and proof page may state the user logged in with X, but must not claim HumanX verified the final tweet id. |
| Popup failure in World webview | Use same-window X intent navigation. |

## 8. Failure Modes and Recovery

| Failure | User-Facing Result | Engineering Behavior |
|---|---|---|
| Missing World env vars | Verification unavailable | Return `503 configuration_error`; UI keeps compose usable but disables proof creation. |
| IDKit rejected/cancelled | Inline error | Allow retry without losing draft. |
| World verifier failure | Inline error | Do not store proof; include non-sensitive status. |
| Signal mismatch | Inline integrity error | Reject request; log server-side reason. |
| Duplicate proof | Show existing proof | Return `200` with existing proof instead of creating duplicates. |
| File store unavailable | Service error | Return `503 storage_error`; do not claim proof creation. |

## 9. Verification Loop

Implementation must complete this loop before moving the manifest to `done`:

1. Implement the app against this spec.
2. Run format/lint/typecheck/build/test gates available in the project.
3. Fix failures and rerun the failed gates.
4. Re-read this spec and compare every required behavior to the code.
5. Repair gaps found in the self-review.
6. Record `verification.spec_review` in the manifest.
7. Because this run used plain `spectacula`, final vetting is `off` unless explicitly requested later.

### 9.1 Required Checks

| Gate | Command |
|---|---|
| Install | `pnpm install` |
| Lint | `pnpm lint` |
| Typecheck | `pnpm typecheck` |
| Tests | `pnpm test` |
| Build | `pnpm build` |
| Spectacula lifecycle | `python3 /Users/kent/.codex/skills/spectacula/scripts/spectacula.py validate` |

### 9.2 App Store Readiness Checks

| Check | Expected Result |
|---|---|
| Metadata doc | `WORLD_APP_STORE.md` exists with suggested listing copy, production env vars, test instructions, and asset specs. |
| Branding scan | UI and docs do not call HumanX an official World app and do not include World logo assets. |
| Mobile constraints | Home screen renders without footer/sidebar/hamburger and handles narrow mobile viewport. |
| Configuration behavior | Missing World secrets produce a clear disabled verification state, not an infinite loader. |
| Live submission blocker | Manifest records that production deployment still requires real Developer Portal app id, RP id, signing key, HTTPS URL, and support email. |

## 10. Definition of Done

- [ ] Next.js mobile-first app exists and runs locally.
- [ ] X login is required before proof creation.
- [ ] MiniKit provider is installed at app root.
- [ ] IDKit verification flow is wired with backend RP signatures.
- [ ] Backend proof creation verifies through World API and checks signal binding.
- [ ] Public proof pages render from stored claims.
- [ ] X Web Intent uses proof URL and same-window navigation.
- [ ] Secrets are documented in `.env.example`.
- [ ] World App Store submission guidance is documented in `WORLD_APP_STORE.md`.
- [ ] Unit tests cover normalization, signal hashing, X intent URLs, goal contract, and store behavior.
- [ ] Lint, typecheck, tests, build, and Spectacula validation pass or any blocker is explicitly recorded.
- [ ] Manifest records self-review result.

## 11. Assumptions and Future Work

### 11.1 Assumptions

| Assumption | Impact |
|---|---|
| The intended mobile surface is a World Mini App, not a native iOS/Android binary. | Build as web app for World App webview. |
| V1 can use X Web Intent instead of X API posting. | Users manually confirm the post; the app cannot verify the resulting tweet id. |
| A file store is acceptable for local MVP verification. | Production needs a durable database before public launch. |
| The Developer Portal will provide app id, RP id, and signing key out-of-band. | Real World ID verification cannot run until env vars are supplied. |
| Store listing assets are not yet designed. | Build must document required app icon and content-card assets but cannot generate final brand-approved assets without design input. |

### 11.2 Future Work

| Future Work | Benefit |
|---|---|
| X OAuth 2.0 integration | Cryptographically bind proof to the authenticated X account and returned post id. |
| Durable database adapter | Production-safe persistence and concurrency. |
| Admin/review tooling | Moderate abuse and inspect failed verification patterns. |
| Localization | Align with World guidance for English, Spanish, Thai, Japanese, Korean, and Portuguese. |
