# HumanX

[![CI](https://github.com/kent/humanx/actions/workflows/ci.yml/badge.svg)](https://github.com/kent/humanx/actions/workflows/ci.yml)
[![CodeQL](https://github.com/kent/humanx/actions/workflows/codeql.yml/badge.svg)](https://github.com/kent/humanx/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://github.com/kent/humanx/actions/workflows/scorecard.yml/badge.svg)](https://github.com/kent/humanx/actions/workflows/scorecard.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

HumanX is a World Mini App that creates a public proof link for an X post after the creator completes World ID verification through IDKit.

HumanX does not claim X account ownership in v1. It creates a World ID backed proof for the exact post text and opens X Web Intent so the user can post manually.

## Features

- Mobile-first World Mini App shell with MiniKit.
- IDKit proof request flow with backend RP signatures.
- Server-side forwarding to the World verifier.
- Signal binding between normalized post text and World ID proof.
- Public proof pages with short commitments instead of public nullifiers.
- Same-window X Web Intent flow for World App webview compatibility.
- Edit-token protected attachment of final X post URLs.

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
docs/spectacula         Product/implementation spec and lifecycle manifest
public                  App icon and store-card source assets
```

## Environment

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_WORLD_APP_ID`
- `WORLD_RP_ID`
- `WORLD_RP_SIGNING_KEY`
- `WORLD_ID_ACTION=humanx-tweet-proof`
- `WORLD_ID_ENVIRONMENT=staging` for simulator testing, `production` for submission
- `NEXT_PUBLIC_APP_URL`
- `SUPPORT_EMAIL`

Never commit `.env`, `.env.local`, World signing keys, or production store data.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
python3 /Users/kent/.codex/skills/spectacula/scripts/spectacula.py validate
```

World App Store submission notes are in `WORLD_APP_STORE.md`.

## Deployment

HumanX is prepared for World App Store review, but production deployment still needs:

- Real World Developer Portal app id, RP id, and signing key.
- A production HTTPS URL configured as `NEXT_PUBLIC_APP_URL`.
- A public support contact.
- Final exported PNG store assets.
- A durable production database replacing the local file store.

See `WORLD_APP_STORE.md` for the submission checklist.

## Open Source

HumanX is released under the MIT License. Contributions are welcome through issues and pull requests.

Before contributing, read:

- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`

World, World ID, World App, X, and Twitter are trademarks or services of their respective owners. HumanX is independent and is not an official World or X product.
