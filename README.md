# VeriPost

[![CI](https://github.com/kent/humanx/actions/workflows/ci.yml/badge.svg)](https://github.com/kent/humanx/actions/workflows/ci.yml)
[![CodeQL](https://github.com/kent/humanx/actions/workflows/codeql.yml/badge.svg)](https://github.com/kent/humanx/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://github.com/kent/humanx/actions/workflows/scorecard.yml/badge.svg)](https://github.com/kent/humanx/actions/workflows/scorecard.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

VeriPost is a World Mini App that creates a public proof link for an X post after the creator completes World ID verification through IDKit.

VeriPost requires X login before proof creation, creates a World ID backed proof for the exact post text, and opens X Web Intent so the user can post manually with the proof link attached.

## Features

- Mobile-first World Mini App shell with MiniKit.
- IDKit proof request flow with backend RP signatures.
- Server-side forwarding to the World verifier.
- Signal binding between normalized post text and World ID proof.
- Public proof pages with short commitments instead of public nullifiers.
- X login with Auth.js before proof creation.
- Same-window X Web Intent flow for World App webview compatibility.
- Dual-mode storage: Postgres in production (via `POSTGRES_URL`), local file store for dev/tests.

## Local Development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. Proof creation is disabled until World Developer Portal credentials are configured.

## Project Structure

```text
src/app                 Next.js App Router pages and route handlers
src/components          Mobile compose flow
src/lib                 Proof, World ID, text, URL, and storage helpers
migrations              Plain SQL schema migrations applied by scripts/migrate.mjs
docs/spectacula         Product/implementation spec and lifecycle manifest
public                  App icon and store-card source assets
```

## Environment

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_WORLD_APP_ID`
- `WORLD_RP_ID`
- `WORLD_RP_SIGNING_KEY`
- `WORLD_ID_ACTION=veripost-tweet-proof`
- `WORLD_ID_ENVIRONMENT=staging` for simulator testing, `production` for submission
- `NEXT_PUBLIC_APP_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `X_CLIENT_ID`
- `X_CLIENT_SECRET`
- `POSTGRES_URL` (production) — when set, proofs persist to Postgres; when unset, the file store at `.data/proofs.json` is used.
- `SUPPORT_EMAIL`

Never commit `.env`, `.env.local`, World signing keys, or production store data.

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
python3 /Users/kent/.codex/skills/spectacula/scripts/spectacula.py validate
```

World App Store submission notes are in `WORLD_APP_STORE.md`.

## Deployment

VeriPost is hosted on Vercel with Cloudflare DNS. Required for World App Store submission:

- Real World Developer Portal app id, RP id, and signing key.
- X OAuth 2.0 client id and secret (callback `/api/auth/callback/twitter`).
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
