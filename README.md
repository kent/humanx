# VeriPost

[![CI](https://github.com/kent/humanx/actions/workflows/ci.yml/badge.svg)](https://github.com/kent/humanx/actions/workflows/ci.yml)
[![CodeQL](https://github.com/kent/humanx/actions/workflows/codeql.yml/badge.svg)](https://github.com/kent/humanx/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://github.com/kent/humanx/actions/workflows/scorecard.yml/badge.svg)](https://github.com/kent/humanx/actions/workflows/scorecard.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

VeriPost is a World Mini App that creates a public proof link for an X post from the creator's logged-in World ID inside World App.

VeriPost runs inside World App, reads the already logged-in World App account context, verifies that account through the World ID Address Book on the backend, and keeps the result in the mini app until the user chooses to open X Web Intent. It does not open IDKit, wallet auth, connector, browser login, or X login during proof creation.

## Features

- Mobile-first World Mini App shell using the logged-in World App runtime context.
- World App account-context proofing through backend World ID Address Book verification.
- Inline World App-required errors for non-mini-app launches; the primary action does not open a World universal link.
- Server-side proof claim creation bound to the exact normalized post text.
- Signal binding between normalized post text and the created proof claim.
- Public proof pages with short commitments instead of public verifier values.
- No separate web login, connector redirect, or external auth navigation before proof creation.
- Explicit same-window X Web Intent action after proof creation for World App webview compatibility.
- Dual-mode storage: Postgres in production (via `POSTGRES_URL`), local file store for dev/tests.

## Local Development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. Proof creation is disabled until a World Mini App id is configured.

## Project Structure

```text
src/app                 Next.js App Router pages and route handlers
src/components          Mobile compose flow
src/lib                 Proof, World App account, text, URL, and storage helpers
migrations              Plain SQL schema migrations applied by scripts/migrate.mjs
docs/spectacula         Product/implementation spec and lifecycle manifest
public                  App icon and store-card source assets
```

## Environment

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_WORLD_APP_ID`
- `WORLD_ID_ACTION=veripost-tweet-proof`
- `WORLD_ID_ENVIRONMENT=staging` for simulator testing, `production` for submission
- `NEXT_PUBLIC_APP_URL`
- `POSTGRES_URL` (production) - when set, proofs persist to Postgres; when unset, the file store at `.data/proofs.json` is used.
- `WORLD_CHAIN_RPC_URL` (optional) - used for World ID Address Book checks when overriding the public World Chain RPC.
- `SUPPORT_EMAIL`

RP signing variables are not used by the current account-context proof path.

Never commit `.env`, `.env.local`, or production store data.

## Database

Production uses Postgres (Vercel Postgres / Neon). Apply migrations once after provisioning:

```bash
vercel env pull .env.production.local --environment=production
POSTGRES_URL=$(grep ^POSTGRES_URL .env.production.local | cut -d= -f2- | tr -d '"') pnpm db:migrate
```

## Verification

```bash
pnpm verify
pnpm audit --audit-level moderate
bash /Users/kent/.codex/skills/spectacula/scripts/spectacula validate --repo .
```

World App Store submission notes are in `WORLD_APP_STORE.md`.

## Deployment

VeriPost is hosted on Vercel with Cloudflare DNS. Required for World App Store submission:

- Real World Developer Portal Mini App id available to the client.
- World Developer Portal listing metadata updated to the current account-context in-World-App proof flow.
- Production HTTPS URL (currently `https://veripost.io`).
- Public support contact (currently `support@veripost.io`).
- Final exported PNG store assets (see `public/app-icon.png`, `public/store-card.png`).
- Postgres database with applied migrations (`POSTGRES_URL`).

See `WORLD_APP_STORE.md` for the submission checklist.

## Open Source

VeriPost is released under the MIT License. Contributions are welcome through issues and pull requests.

Before contributing, read:

- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`

World, World ID, World App, X, and Twitter are trademarks or services of their respective owners. VeriPost is independent and is not an official World or X product.
