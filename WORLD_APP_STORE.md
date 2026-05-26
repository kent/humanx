# HumanX World App Store Submission Notes

HumanX is built as a World Mini App: a mobile-first web app running inside World App through MiniKit, with IDKit proof verification on the backend.

## Listing Draft

| Field | Draft |
|---|---|
| App name | HumanX |
| Short description | Prove a post came from a verified human without revealing identity. |
| Category | Social |
| Support email | Set `SUPPORT_EMAIL` before submission. |
| Website URL | Set production `NEXT_PUBLIC_APP_URL`. |

Do not use "official" in the listing or UI. Do not use the World logo or a modified World logo.

## Required Production Configuration

- `NEXT_PUBLIC_WORLD_APP_ID`
- `WORLD_RP_ID`
- `WORLD_RP_SIGNING_KEY`
- `WORLD_ID_ACTION=humanx-tweet-proof`
- `WORLD_ID_ENVIRONMENT=production`
- `NEXT_PUBLIC_APP_URL=https://<production-host>`
- `NEXTAUTH_URL=https://<production-host>`
- `NEXTAUTH_SECRET=<strong-random-secret>`
- `X_CLIENT_ID=<x-oauth-client-id>`
- `X_CLIENT_SECRET=<x-oauth-client-secret>`
- `SUPPORT_EMAIL=<public-support-email>`

Production storage should replace the local file store with a durable database before a public launch.

## Store Assets

| Asset | Requirement | Current Source |
|---|---|---|
| App icon | Square image with non-white background | `public/app-icon.svg` |
| Content card | 345x240 px, exported as PNG at 3x, bottom 94 px free of important detail | `public/store-card.svg` source at 1035x720 |

Export final PNGs without metadata before Developer Portal submission.

## Review Test Flow

1. Open the production HTTPS URL from the Developer Portal Mini App tester.
2. Confirm the app loads without footer, sidebar, hamburger menu, or infinite loading.
3. Tap "Login with X" and complete X OAuth.
4. Enter a short X post.
5. Tap "Post" and complete World ID verification through IDKit.
6. Confirm X opens in the same webview/window with the proof URL attached.
7. Open the public proof page and confirm it shows the post text, X username, digest, timestamp, and commitment.

## Current Submission Blockers

- Real Developer Portal app id, RP id, and signing key are required for live verification.
- X OAuth 2.0 client id/secret and Auth.js secret are required for X login.
- Production HTTPS hosting URL is required.
- Public support email is required.
- Final PNG store assets should be exported from the provided SVG sources or replaced by approved brand assets.
