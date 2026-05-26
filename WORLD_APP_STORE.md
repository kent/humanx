# VeriPost World App Store Submission Notes

VeriPost is built as a World Mini App: a mobile-first web app running inside World App through MiniKit, with IDKit proof verification on the backend.

## Listing Draft

| Field | Draft |
|---|---|
| App name | VeriPost |
| Short description | Prove a post came from a verified human without revealing identity. |
| Category | Social |
| Support email | support@veripost.io |
| Website URL | https://veripost.io |

Do not use "official" in the listing or UI. Do not use the World logo or a modified World logo.

## Required Production Configuration

- `NEXT_PUBLIC_WORLD_APP_ID`
- `WORLD_RP_ID`
- `WORLD_RP_SIGNING_KEY`
- `WORLD_ID_ACTION=veripost-tweet-proof`
- `WORLD_ID_ENVIRONMENT=production`
- `NEXT_PUBLIC_APP_URL=https://veripost.io`
- `NEXTAUTH_URL=https://veripost.io`
- `NEXTAUTH_SECRET=<strong-random-secret>`
- `X_CLIENT_ID=<x-oauth-client-id>`
- `X_CLIENT_SECRET=<x-oauth-client-secret>`
- `POSTGRES_URL=<vercel-postgres-or-neon-connection-string>`
- `SUPPORT_EMAIL=support@veripost.io`

Production storage uses Postgres. Run `pnpm db:migrate` once after provisioning to apply `migrations/0001_init.sql`.

## Store Assets

| Asset | Requirement | Source | Exported |
|---|---|---|---|
| App icon | Square image with non-white background | `public/app-icon.svg` | `public/app-icon.png` (1024×1024) |
| Content card | 345x240 px, exported as PNG at 3x, bottom 94 px free of important detail | `public/store-card.svg` (1035×720) | `public/store-card.png` (1035×720) |

PNGs are pre-stripped of metadata before submission.

## Review Test Flow

1. Open https://veripost.io from the Developer Portal Mini App tester.
2. Confirm the app loads without footer, sidebar, hamburger menu, or infinite loading.
3. Tap "Login with X" and complete X OAuth.
4. Enter a short X post.
5. Tap "Post" and complete World ID verification through IDKit.
6. Confirm X opens in the same webview/window with the proof URL attached.
7. Open the public proof page and confirm it shows the post text, X username, digest, timestamp, and commitment.

## Current Submission Blockers

- Real Developer Portal app id, RP id, and signing key are required for live verification (register action `veripost-tweet-proof`).
- X OAuth 2.0 client id/secret are required for X login (callback `https://veripost.io/api/auth/callback/twitter`, scopes `tweet.read users.read offline.access`).
- Postgres connection string set in production env and migrations applied.
