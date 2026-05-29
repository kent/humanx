# VeriPost World App Store Submission Notes

VeriPost is built as a World Mini App: a mobile-first web app running inside World App through MiniKit, with IDKit proof verification on the backend.

External requirements checked on 2026-05-28:

- World Mini App Store submissions go through the Developer Portal and, after approval, become discoverable in World App.
- World review expects a final app, complete metadata, a live IDKit or MiniKit integration, review-team access, valid contact details, legal compliance, and reliable Android/iOS behavior.
- World app guidelines expect mobile-first UI, no footers/sidebars/hamburger menus, no "official" wording, no World logo remixing, square non-white icons, and correctly exported content cards.
- Apple iOS review rules for hosted mini apps require privacy compliance, objectionable-content reporting/moderation paths, no unapproved native API bridging, and complete metadata/manifest data supplied by the host app.

## Listing Draft

| Field | Draft |
|---|---|
| App name | VeriPost |
| Short description | Prove a post came from a verified human without revealing identity. |
| Category | Social |
| Support email | support@veripost.io |
| Website URL | https://veripost.io |
| Support URL | https://veripost.io/support |
| Privacy URL | https://veripost.io/privacy |

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
| App icon | Square image with non-white background | `public/app-icon.svg` | `public/app-icon.png` (1024x1024) |
| Content card | 345x240 px, exported as PNG at 3x, bottom 94 px free of important detail | `public/store-card.svg` (1035x720) | `public/store-card.png` (1035x720) |
| Review screenshots | Internal review/support evidence | `public/screenshots/` | PNG screenshots |

PNGs are pre-stripped of metadata before submission.

## First iOS User Checklist

These items must be true before sending the first iOS user through World App discovery:

- World Developer Portal app is created for VeriPost with World ID 4.0/RP enabled.
- Production `app_id`, `rp_id`, and signing key are installed only in server-side env vars.
- Action `veripost-tweet-proof` exists in the portal and matches production env exactly.
- The Mini App URL is `https://veripost.io`, served over HTTPS, and reachable from an iPhone inside World App.
- The portal listing includes app name, short description, category, support email, support URL, privacy URL, icon PNG, and content-card PNG.
- X OAuth 2.0 is live with callback `https://veripost.io/api/auth/callback/twitter` and scopes needed by Auth.js for login.
- Postgres is provisioned, `POSTGRES_URL` is set in production, and `pnpm db:migrate` has been run.
- Vercel production deployment uses the commit intended for launch and the GitHub `Verify` check is green.
- `/privacy` and `/support` load publicly and `support@veripost.io` receives mail.
- Public proof pages include a report path so abusive proof content can be reviewed and removed.
- A real iPhone test confirms the iOS flow: open in World App, log in with X, write text, complete World ID proof, return to X Web Intent, post, open proof URL.
- For a user who does not have World App installed, the user installs World App from the iOS App Store, completes onboarding, returns to VeriPost in World App, and starts the proof again. iOS does not preserve the original verification context through App Store install.

## Review Test Flow

1. Open `https://veripost.io` from the Developer Portal Mini App tester or a production World App test link.
2. Confirm the app loads without footer, sidebar, hamburger menu, or infinite loading.
3. Tap "Login with X" and complete X OAuth.
4. Enter a short X post.
5. Tap "Post" and complete World ID verification through IDKit.
6. Confirm X opens in the same webview/window with the proof URL attached.
7. Open the public proof page and confirm it shows the post text, X username, digest, timestamp, commitment, and report link.
8. Open `https://veripost.io/privacy` and `https://veripost.io/support`.

## Current Submission Blockers

- Real Developer Portal app id, RP id, and signing key are required for live verification.
- X OAuth 2.0 client id/secret are required for X login.
- Production database env names currently exist in Vercel, but pulled values are empty for `POSTGRES_URL` and `DATABASE_URL`; set one of them to a real Neon/Postgres URL, redeploy, and run `pnpm db:migrate`.
- Production deployment and GitHub `Verify` status must be confirmed for the launch commit.
- The first real iPhone/World App test must be completed with production credentials.
- Legal review should confirm the X-login-only creation flow is acceptable for iOS because X login is required to create an X post, while public proof viewing remains available without login.
