# VeriPost World App Store Submission Notes

VeriPost is built as a World Mini App: a mobile-first web app running inside World App. The current source proof flow uses in-app IDKit proof verification, verifies that proof on the backend, and creates a public proof link for the exact post text. The Post action does not launch wallet-auth, fallback wallets, wallet permission prompts, X login, browser authentication, connector navigation, or external auth navigation.

External requirements checked on 2026-06-01 UTC:

- World Mini App Store submissions go through the Developer Portal and, after approval, become discoverable in World App.
- Review expects a final app, complete metadata, live World App runtime integration, review-team access, valid contact details, legal compliance, and reliable Android/iOS behavior.
- World app guidelines expect mobile-first UI, no footers/sidebars/hamburger menus, no "official" wording, no World logo remixing, square non-white icons, and correctly exported content cards.

## Listing Draft

| Field | Draft |
|---|---|
| App name | VeriPost |
| Short description | Prove a post came from a verified human without revealing identity. |
| Long description | VeriPost opens inside World App, prepares an in-app World ID proof for the exact post text, verifies that proof on the backend, and creates a public proof link. Proof creation does not start wallet-auth, X login, a wallet connector, fallback wallet, or external browser authentication flow. After the proof is ready, the user can explicitly open X with the proof link attached. |
| Category | Social |
| Support email | support@veripost.io |
| Website URL | https://veripost.io |
| Support URL | https://veripost.io/support |
| Privacy URL | https://veripost.io/privacy |

Do not use "official" in the listing or UI. Do not use the World logo or a modified World logo.

## Required Production Configuration

- `NEXT_PUBLIC_WORLD_APP_ID`
- `WORLD_ID_RP_ID`
- `WORLD_ID_RP_SIGNING_KEY`
- `WORLD_ID_ACTION=veripost-tweet-proof`
- `WORLD_ID_ENVIRONMENT=production`
- `NEXT_PUBLIC_APP_URL=https://veripost.io`
- `POSTGRES_URL=<vercel-postgres-or-neon-connection-string>`
- `SUPPORT_EMAIL=support@veripost.io`

Production storage uses Postgres. Run `pnpm db:migrate` once after provisioning to apply `migrations/0001_init.sql`.

Wallet-auth cookie secrets are not required by the active IDKit-native Post path. Do not configure legacy redirect-capable proof/login variables in production. `X_CLIENT_SECRET`, `X_CLIENT_ID`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` are not used by the current source proof flow.

## Store Assets

| Asset | Requirement | Source | Exported |
|---|---|---|---|
| App icon | Square image with non-white background | `public/app-icon.svg` | `public/app-icon.png` (1024x1024) |
| Content card | 345x240 px, exported as PNG at 3x, bottom 94 px free of important detail | `public/store-card.svg` (1035x720) | `public/store-card.png` (1035x720) |
| Review screenshots | Internal review/support evidence | `public/screenshots/` | `01-compose-open.png`, `02-compose-world-app.png`, `03-creating-proof.png` |

PNGs are pre-stripped of metadata before submission.

## First iOS User Checklist

- World Developer Portal Mini App is created for VeriPost.
- Production `app_id` is installed in client/server env vars as appropriate.
- Action `veripost-tweet-proof` is configured consistently in production proof metadata.
- The Mini App URL is `https://veripost.io`, served over HTTPS, and reachable from an iPhone inside World App.
- The canonical launch URL is `https://world.org/mini-app?app_id=app_dc56f8eecb48c4d395981ec1ca5c6329&path=/`.
- The public World ecosystem listing still contains old "Log in with X" / "complete a private World ID proof" copy as of 2026-06-02T17:00:09Z. A public probe of the canonical launch URL resolves to `https://world.org/ecosystem/app_dc56f8eecb48c4d395981ec1ca5c6329?path=%2F`; that HTML also includes World's not-found copy, "Page you are trying to find doesn't exist". Treat the store load error as a Developer Portal/listing publication blocker until the listing is republished and approved.
- Postgres is provisioned, `POSTGRES_URL` is set in production, and `pnpm db:migrate` has been run.
- `https://veripost.io/api/health` returns `ok: true`.
- `/privacy` and `/support` load publicly and `support@veripost.io` receives mail.
- A real iPhone test confirms the iOS flow: open in World App, write text, tap "Post", stay inside the mini app, complete the in-app World ID proof, reach proof-ready, tap "Post to X", post, open proof URL.
- A non-mini-app launch test confirms the primary action never opens a World App universal link or external auth surface; it stays on the page and ends in an inline World App-required/proof-configuration state.

## Verified Readiness

Historical readiness through 2026-06-01 UTC. The current production status below supersedes any older active-flow language in this section:

- Focused account-context compose, no-native-proof, proof route, runtime-diagnostics, middleware, and GOALS tests passed.
- `pnpm typecheck` passed after clearing stale `.next/types` generated for the removed wallet-auth route.
- Focused head-level runtime diagnostics verification passed with 115 tests across the early guard, World App runtime, compose flow, runtime diagnostics, and GOALS suites. The early guard now emits one redacted `world_runtime_initial` diagnostic before React hydration when a likely World App surface is visible, without wallet or draft leakage.
- Focused auth-alias recovery verification passed with 64 tests across launch-query redaction, middleware/proxy, hydrated navigation guard, head guard, and GOALS suites. Longer stale auth aliases such as `/authenticate`, `/authorization`, `/api/authorize`, `?authorize=true`, and `?path=/authenticate` recover or fail closed inside the mini app just like `/auth`.
- Focused dashed/underscored sign-in/log-in/world-auth alias recovery verification passed with 64 tests across launch-query redaction, middleware/proxy, hydrated navigation guard, head guard, and GOALS suites. Stale aliases such as `/sign-in`, `/log_in`, `/api/sign-in`, `/api/log_in`, `/world/sign-in`, `/world-auth`, `?logIn=true`, `?sign_in=true`, `?path=/sign-in`, and `?path=/api/log_in` now recover or fail closed inside the mini app.
- Broader runtime/compose verification passed with 102 tests across legacy auth state cleanup, compose flow, no-native-proof compose flow, World App runtime, runtime diagnostics, and GOALS suites.
- Full verification passed: `pnpm verify` completed lint, typecheck, 21 Vitest files, 207 Vitest tests, 7 GOALS contract tests, and Next build.
- `pnpm audit --audit-level moderate`, Spectacula validation, JSON validation, and `git diff --check` passed.
- `@worldcoin/minikit-js` is installed only for official in-app account-state hydration through configured startup `MiniKit.install(appId)` using the build-time `NEXT_PUBLIC_WORLD_APP_ID` when `window.WorldApp` is already present and config-aware `MiniKit.install(appId)` after `/api/config` returns. App-id-less official startup initialization is allowed only on real `window.WorldApp` surfaces when no build-time app id is available. The active runtime also reads existing `window.WorldApp` / host MiniKit / account-provider state and can send only a narrow World App `command:"init"` state request when account context is missing. The request can run when a real World App native bridge appears before `window.WorldApp` with either World App user-agent evidence or strong MiniKit/WorldApp bridge evidence, retries on a one-second cooldown up to five attempts while account context remains missing, retries after a missing native transport later appears, and falls back to the actual native bridge if official MiniKit install cannot reach it because the host exposes alternate iOS handler casing or Android with a `webkit` object. Generic ReactNative-style bridge-only pages still receive no native message.
- The previous account-context Post path did not call `MiniKit.walletAuth`, wallet-auth routes, verify, sign-message, sign-typed-data, wallet permissions, connector navigation, X login, World universal-link code, Wagmi fallback, or `ethereum.request`. `MiniKit.install(appId)` is initialization only; it is not a proof/auth prompt. After state-only MiniKit initialization, redirect-capable MiniKit command methods exposed on `window.MiniKit` or older nested command stubs were patched to fail closed and emit redacted `world_external_navigation_blocked` diagnostics (`minikit-command=blocked`) instead of sending wallet-auth/sign/open-url commands from stale injected handlers. On real World App surfaces, direct native bridge `postMessage` command payloads are also guarded before and after React hydration: `command:"init"` remains allowed for account-state hydration, while stale wallet-auth/sign/open-url command payloads are dropped and reported as `native-command=blocked` or `early-native-command=blocked`. The head guard refreshes briefly during startup so late-injected native bridge targets are wrapped before stale pre-hydration handlers can use them.
- The Post button is available once config and text are valid, even if early World App detection has not fired yet. Tapping Post refreshes World App runtime state and starts the current IDKit-native proof request without wallet-auth prompts.
- `/api/world-wallet-auth/nonce` is removed from the app route list and is trapped as a stale auth route with same-origin HTTP 410 `legacy_auth_removed`.
- `/api/world-proof/request`, `src/lib/world-idkit-proof.ts`, `src/lib/world-id-proof.ts`, and `src/lib/world-wallet-auth.ts` are removed from source.
- The previous account-context route accepted `{ draftText, worldAppAccount }` payloads with `x-veripost-world-app-flow: account-context` and verified the submitted account address through the World ID Address Book before proof storage.
- Compose does not call `/api/world-proof/request`, `/api/world-wallet-auth/nonce`, or submit `worldIdProof`/`worldWalletAuth`; stale proof and stale wallet-auth payloads fail closed before proof storage.
- Source scans confirm the primary compose/proof path does not call sign-message, sign-typed-data, X login, `ethereum.request`, wallet permission APIs, `window.open`, Wagmi fallback, wallet-auth, or app-owned connector navigation.
- `https://veripost.io` is deployed on Vercel production deployment `dpl_EsifHZiSoGzi8PXnbn1tUxmouH2Y`.
- Root HTML contains `data-dpl-id="dpl_EsifHZiSoGzi8PXnbn1tUxmouH2Y"` and keeps no-store/Clear-Site-Data headers, `X-VeriPost-Flow: world-miniapp-account-context-2026-06-01`, plus path-scoped tweet-intent CSP.
- The client emits redacted `world_account_check_started`, `world_account_context_detected`, `world_proof_request_started`, and `world_proof_ready` diagnostics. The head-installed early guard emits a redacted `world_runtime_initial` diagnostic before React hydration when it sees likely World App runtime evidence, so a World App exit before hydration can still leave runtime shape evidence. The server root request also logs a redacted launch-query shape with query keys only, including `safeRootPathHandoff` for clean World-style `?path=/` launches and auth-trigger key classification for stale handoffs. These diagnostics include runtime shape only, not wallet, draft, proof, nonce, SIWE message, signature data, or callback values. Hydrated diagnostics use `sendBeacon` first and a same-origin `fetch` fallback with `keepalive: true` for pagehide/hidden-webview delivery.
- Production browser-loaded assets contain the configured app id `app_dc56f8eecb48c4d395981ec1ca5c6329`, `__without_app_id__`, `world_account_context_pending`, `world_account_check_started`, `world_account_context_detected`, `world_proof_request_started`, `world_proof_ready`, `waitForWorldAppAccountRuntime`, `MiniKit.install`, `command:"init"`, `payload:{version:1,minorVersion:96}`, `MiniKitAndroid`, `WorldAppAndroid`, `ReactNativeWebView`, `/api/runtime-diagnostics`, `world_runtime_initial`, `authenticate|authentication|authorize|authorization`, `sign-in`, `log_in`, `world-auth`, `veripost:minikit-command-blocked`, `minikit-command=blocked`, `veripost:native-command-blocked`, `native-command=blocked`, `early_native_command`, `veripost.native-post-message-guarded`, `isLegacyAuthTriggerQueryKey`, `safeRootPathHandoff`, `authTriggerKeys`, and a `keepalive` marker; source probes confirm no app-owned calls to `MiniKit.walletAuth`, `walletAuth`, `command:"wallet-auth"`, `command:"sign-message"`, `command:"sign-typed-data"`, `miniapp-wallet-auth`, `world_wallet_auth_started`, `world_wallet_auth_ready`, X OAuth, IDKit, connector-opening calls, `/api/world-proof/request`, `requestNativeWorldIdProof`, `MiniKitProvider`, signer-bypass material, Wagmi fallback, or `ethereum.request`. Browser assets may contain unused SDK command implementations from `@worldcoin/minikit-js`; these are not invoked by the Post path. The source marker `BUILD_TIME_WORLD_APP_ID` and helper name `hasLikelyWorldAppNativeTransport` are minified out of loaded browser assets, while the app id literal and native bridge markers confirm the production value, bridge-first path, fail-closed MiniKit command guard, hydrated direct native bridge command guard, pre-hydration direct native bridge command guard, head-level runtime initial diagnostic, longer auth-alias recovery, dashed/underscored stale auth-alias recovery, and redacted root-launch query logger were bundled.
- `GET https://veripost.io/api/config` is healthy, and `GET https://veripost.io/api/health` returned healthy on three consecutive probes; neither endpoint exposes native proof readiness fields.
- `POST https://veripost.io/api/world-proof/request` returns HTTP 404, confirming the old RP/native proof request route is gone in production.
- `POST https://veripost.io/api/world-wallet-auth/nonce` returns HTTP 410 with same-origin JSON `legacy_auth_removed`, including sparse `Accept: */*` JSON posts, confirming the stale wallet-auth nonce route cannot start an auth flow.
- A historical fake account-context proof using `{ draftText, worldAppAccount }` reached Address Book verification and returned HTTP 403 `world_address_unverified`, confirming the removed account-context proof route no longer required `worldWalletAuth` and still rejected unverified accounts before storage.
- World App document requests to removed auth and mini app shell paths now recover inside the mini app without an external `Location`. No-query stale auth launches, sparse stale auth launches, and exact mini app shell launches return `x-veripost-legacy-recovery: static-fetch`, a sanitized same-origin loader that cleans the visible URL to `/` with `history.replaceState` and fetches the clean root app shell without top-level `window.location.replace`, middleware rewrite, stale Next route state, app-rewrite marker, or callback/OAuth target serialization. The head-installed early guard also normalizes stale auth, mini app shell, root-query, `#?key=value`, and bare `#key=value` hash handoff browser URLs to `/` before React hydration, blocks stale runtime `history.pushState` / `history.replaceState` handoffs, and recovers direct `hashchange` stale handoffs while preserving safe `/proof/*` paths.
- `/sw.js` and `/service-worker.js` are byte-identical self-unregistering kill scripts with no-store, `Clear-Site-Data`, and `Service-Worker-Allowed: /` headers; activation now navigates controlled clients through `getRecoveryUrl(client.url)` so stale auth paths, stale root handoff queries, and stale hash handoffs recover to `/` before any stale service-worker reload can re-open an auth URL.
- Sparse World App legacy launch requests with `user-agent: WorldApp`, `Accept: */*`, and `sec-fetch-mode: cors` use the same static-fetch recovery; explicit JSON requests still return same-origin `410 legacy_auth_removed`.
- Non-World-App document requests to the same removed paths still recover as a minimal same-origin static recovery document with no external `Location`, `x-veripost-legacy-recovery: static`, no Next app-shell route state, no meta refresh, a strict `navigate-to 'self'; form-action 'none'` CSP, and only a same-origin `/` continue link.
- Stale root query handoffs such as `?path=/api/auth/signin/twitter`, `?path=/authenticate`, `?path=/sign-in`, `?path=/api/log_in`, external auth `callbackUrl` or `redirect_uri` values, bare/empty auth-shaped keys such as `?auth`, `?authenticate=true`, `?authorize=true`, `?logIn=true`, `?sign_in=true`, `?callbackUrl=`, and `?walletAuth=`, unsafe native callback targets such as `returnTo=worldapp://...`, equivalent URL-fragment handoffs such as `#?returnTo=worldapp://...`, stale World verifier handoffs such as `world.org/verify`, `worldcoin.org/verify`, or `/mini-app`, off-origin `path` / `pathname` / `next` / `url` / `returnUrl` / `redirect_to` / `continue` / `target` / `destinationUrl` / `state` handoff values, and unknown keys with URL/path-like auth handoff values now recover in-place without exposing target values in diagnostics or recovery bodies. Clean World-style `?path=/` remains allowed and is logged as `safeRootPathHandoff:true`. The only off-origin root-query target still allowed is the explicit X/Twitter tweet intent used after proof creation.
- Live document-shaped probes to `/sign-in`, `/log_in`, `/api/sign-in`, `/api/log_in`, `/world/sign-in`, `/world-auth`, `?logIn=true`, and `?sign_in=true` returned same-origin `static-fetch` recovery with no external `Location`; explicit JSON `POST /api/sign-in` returned same-origin `410 legacy_auth_removed`.
- Live document-shaped probes to query-bearing stale auth paths and root query handoffs return same-origin `static-fetch` recovery HTML with no external `Location`, no middleware rewrite, strict `navigate-to 'self'; form-action 'none'` CSP, `history.replaceState` cleanup, and a same-origin root app-shell fetch; recovery bodies do not use authentication wording and do not embed `x.com/i/oauth`, `callbackUrl`, `redirect_uri`, `client_id`, `worldapp:`, `worldcoin.org`, `auth.example.com`, `token=`, `app_id=`, or `/api/auth/signin`.
- Live document-shaped probes for unknown keys `fallback=api/auth/signin/twitter`, `oauth_callback=x.com/i/oauth2/authorize?...`, `launch=world.org/mini-app?...`, and `oauth_path=oauth2/authorize?...` returned same-origin `static-fetch` recovery HTML with no external `Location`, no middleware rewrite, no target-value leakage, no `window.location.replace`, and no `app-rewrite`; safe root probes `note=world` and `utm=twitter.com/intent/tweet?...` were not trapped.
- The production root/app-shell HTML scan for `dpl_9ADZTQZeAJ6UfiWD8YQdsLfGPniF` did not contain raw stale handoff tokens `callbackUrl`, `redirect_uri`, `worldapp:`, X OAuth paths, `client_id`, `world.org/mini-app`, `window.location.replace`, or `app-rewrite`, while the runtime guards still block stale values when they appear at navigation time.
- Executing the production-shipped inline early guard from live root HTML in a browser-like DOM confirmed a bare hash handoff `#fallback=api/auth/signin/twitter&oauth_callback=x.com/i/oauth2/authorize?...` is cleaned to `/?debug=world` with one redacted `early_legacy_auth_recovery` diagnostic, stale runtime `history.pushState` / `history.replaceState` handoffs are blocked with redacted `early_history_push_state` / `early_history_replace_state` diagnostics, direct stale hash mutation on `/proof/vp_123?debug=world` recovers to the same proof path with a redacted `early_hashchange` diagnostic, pre-hydration `command:"init"` passes to a native bridge injected after the head script, stale `command:"wallet-auth"` is dropped with `veripost:native-command-blocked` and a redacted `early_native_command` diagnostic, and `#note=world` remains allowed.
- Executing the production-shipped inline early guard from live root HTML in a browser-like DOM with a synthetic World App user agent produced a production `world_runtime_initial` log at 2026-06-01T11:40:24Z with `phase:"loading"`, `worldAppUserAgent:true`, `walletAddress:"missing"`, no draft text, and no wallet/address payload fields. This confirms the head-level diagnostic can reach production before React hydration, but it is synthetic and not real-device proof evidence.
- Vercel logs for deployment `dpl_EsifHZiSoGzi8PXnbn1tUxmouH2Y` show clean root launch logging with no query, dashed/underscored stale auth path aliases `/sign-in`, `/log_in`, `/api/sign-in`, `/api/log_in`, `/world/sign-in`, and `/world-auth` trapped as path-source `legacy_auth_entrypoint_blocked`, stale root auth-trigger launches `?logIn=true` and `?sign_in=true` plus root handoffs `?path=/sign-in`, `?path=/api/log_in`, and `?next=/world/sign-in` trapped with only redacted query keys, and fake account-context proof rejection with `world_address_unverified`. The current log probe found no real-device `world_account_context_detected`, `world_proof_request_started`, `world_proof_ready`, or `world_proof_created` evidence yet.

## Current Production Status

The IDKit-native source update is live in production:

- The active Post path prepares `/api/world-proof/rp-context`, requests an in-app IDKit proof, and verifies the proof through `/api/proofs`. It does not require wallet-auth, X login, or fallback wallet navigation.
- `GET https://veripost.io/`, `GET https://veripost.io/api/config`, and `GET https://veripost.io/api/health` are healthy as of 2026-06-02T17:00:02Z.
- `GET https://veripost.io/?path=/` is healthy with and without a World App user agent.
- `GET https://veripost.io/app-icon.png` and `GET https://veripost.io/store-card.png` return live PNG assets.
- `POST https://veripost.io/api/world-wallet-auth/nonce` returns same-origin HTTP 410 `legacy_auth_removed`.

Real-device World App proof completion is still pending.

## Review Test Flow

1. Open `https://veripost.io` from the Developer Portal Mini App tester or a production World App test link.
2. Confirm the app loads without footer, sidebar, hamburger menu, or infinite loading.
3. Enter a short X post.
4. Tap "Post" and confirm VeriPost stays inside World App while it prepares the in-app World ID proof; no wallet-auth prompt, connector, fallback wallet, external browser authentication screen, or World universal link should appear.
5. Complete the in-app proof and confirm the proof-ready state remains inside the mini app.
6. Tap "Post to X" and confirm X opens in the same webview/window with the proof URL attached.
7. Open the plain web URL outside the mini app runtime and confirm the primary action does not open a World App universal link, connector, or auth surface.
8. Open `https://veripost.io/privacy`, `https://veripost.io/support`, and `https://veripost.io/api/health`.

## Current Submission Blockers

- Submit or update the Developer Portal listing with the final metadata and assets, then wait for World review approval.
- Update the existing public World ecosystem listing for `app_dc56f8eecb48c4d395981ec1ca5c6329`; as of 2026-06-02T17:00:09Z the canonical launch URL resolves through `https://world.org/ecosystem/app_dc56f8eecb48c4d395981ec1ca5c6329?path=%2F` with stale "Log in with X" / "complete a private World ID proof" copy and a not-found page payload.
- Complete the first real iPhone/World App test with a production World ID account and X account, confirming `world_idkit_native_started`, `world_proof_ready`, and `world_proof_created` in production logs.
- Confirm `support@veripost.io` receives mail and assign an owner for proof reports/deletion requests.
