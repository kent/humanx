# VeriPost Mobile Proof Mini App Specification

Status: Implementation v1, account-context path active; real-device evidence pending
Purpose: Define and maintain a mobile-first World Mini App that lets a verified human create a public proof link for an X post and publish that proof with the post.
Audience: Engineer, product reviewer, and app reviewer.

## 1. Overview And Goals

VeriPost runs inside World App. The primary proof flow must stay in that mini app surface, use the already logged-in World App account context, verify the account through the World ID Address Book on the backend, and create a proof for the exact post text. The flow must not prompt wallet-auth or redirect the user out of the mini app.

| Goal | Requirement |
|---|---|
| World-native mobile experience | The first screen is the usable compose flow, designed for World App webview constraints. |
| Logged-in World account proof | The Post action submits World App account context with `x-veripost-world-app-flow: account-context`; it does not start wallet-auth, IDKit, X auth, fallback wallet, connector, or browser authentication navigation. |
| No auth escape | The client must never open a connector, fallback wallet, World verifier prompt, X login, external browser authentication surface, wallet-auth prompt, or World universal link from the Post action. |
| Backend verification | The server verifies the submitted World App account address through the World ID Address Book before storage. |
| Exact post binding | The stored proof claim binds the verified nullifier/action/environment to the normalized post text digest and signal hash. |
| Public proof | The app creates a durable public proof page that can be included in an X post. |
| X publishing path | The app builds an X Web Intent URL, then waits for an explicit "Post to X" tap before navigation. |
| Review readiness | Metadata, assets, production notes, diagnostics, and stale-auth traps must support World App review. |

## 2. Current State

The implementation is a Next.js App Router app with:

- `src/components/compose-flow.tsx` as the primary mobile compose flow.
- `src/lib/world-app-runtime.ts` for World App context capture, official MiniKit account-state initialization through configured-app-id startup `MiniKit.install(appId)` and config-aware `MiniKit.install(appId)`, direct and nested account/address-array reads, array-wrapped passive account-message reads, a bounded narrow raw `command:"init"` state request when account context is still missing, bridge-first state hydration for real World App user-agent/native bridge surfaces, host-owned MiniKit state reads, fail-closed MiniKit/native command guards, redacted pending account-context diagnostics, passive runtime diagnostics, keepalive diagnostic delivery fallback, and stale-host diagnostics.
- `src/lib/world-account.ts` for World App account Address Book verification and nullifier derivation.
- `src/app/api/proofs/route.ts` for proof creation after Address Book verification.
- `src/lib/world-miniapp-auth.ts` for the shared flow marker/header.
- stale auth route recovery in `src/proxy.ts`, early stale-location cleanup in the head-installed navigation guard, hydrated navigation guards, stale service-worker/cache purge and stale service-worker client URL recovery, and redacted runtime diagnostics.

The current source flow marker is `world-miniapp-account-context-2026-06-01` for app-shell cache busting, and production proof submission uses `x-veripost-world-app-flow: account-context`.

The runtime may import `@worldcoin/minikit-js` and call `MiniKit.install(appId)` only for official in-app account-state hydration, including build-time startup initialization through `primeWorldAppRuntime(BUILD_TIME_WORLD_APP_ID)` before `/api/config` returns. App-id-less official initialization is allowed only on real `window.WorldApp` surfaces when no build-time app id is available, followed by the config-aware retry. It must not call `MiniKit.walletAuth`, IDKit, MiniKit verify, MiniKit sign-message, MiniKit sign-typed-data, fallback wallet adapters, connector/open-url/wallet-permission commands, X login, `ethereum.request`, or redirect navigation for proof creation. Its only app-owned native message may be the non-auth `command:"init"` state request. That request may run when a real World App native bridge plus World App user-agent evidence or strong MiniKit/WorldApp bridge evidence appears before `window.WorldApp`, may retry on a one-second cooldown up to five attempts while account context remains missing, may retry after native transport appears following an initial missing-transport pass, and may fall back to the actual native bridge when official MiniKit install cannot reach it because the host exposes alternate iOS handler casing or Android with a `webkit` object. Generic ReactNative-style bridge-only pages must receive no native message. After state-only MiniKit initialization, redirect-capable MiniKit command methods exposed on `window.MiniKit` or older nested command stubs must fail closed and emit redacted `world_external_navigation_blocked` diagnostics (`minikit-command=blocked`) instead of sending wallet-auth/sign/verify/open-url commands from stale injected handlers. On real World App surfaces, direct native bridge `postMessage` command payloads must also fail closed before and after React hydration: `command:"init"` remains allowed, while stale wallet-auth/sign/open-url payloads are dropped and reported as `native-command=blocked` or `early-native-command=blocked`. The head guard refreshes briefly during startup so native bridge targets injected after the initial head script still get wrapped before stale pre-hydration handlers can use them.

The active contract is enforced by source, route, diagnostics, and proof-payload checks: no app code calls wallet-auth, no wallet-auth route is exposed, SDK auth methods are not invoked by the app-owned proof path, and no `worldWalletAuth` body is accepted.

## 3. Primary Flow

1. User opens VeriPost in World App.
2. User enters post text and taps "Post".
3. Client validates config, text, proof storage, and World App surface state.
4. Client records `world_account_check_started`, refreshes World App runtime state, calls `primeWorldAppRuntime(BUILD_TIME_WORLD_APP_ID)` at startup so production can run `MiniKit.install(appId)` as soon as `window.WorldApp` is present, calls `MiniKit.install(appId)` again after config is available so official MiniKit user metadata can expose `walletAddress`, and sends a narrow raw World App `command:"init"` state request only when account context is still missing inside a real browser World App surface, including the bridge-first case where the native bridge appears before `window.WorldApp` and either the World App user-agent or strong MiniKit/WorldApp bridge evidence is present. If official MiniKit installs but does not expose account context and did not post to the native bridge that is actually available, the runtime sends the same non-auth init payload to that bridge, covering alternate iOS handler casing and Android surfaces that also expose `webkit`. While account context remains missing, the runtime can retry this same non-auth init payload up to five times on a one-second cooldown, including after native transport appears late.
5. Client waits in place for logged-in World App account context through `waitForWorldAppAccountRuntime(config.appId)`.
6. Client records `world_account_context_detected` once account context is available.
7. Client posts `{ draftText, worldAppAccount }` to `/api/proofs` with the flow marker and redacted runtime session id.
8. Backend validates provenance and JSON shape, normalizes text, verifies `worldAppAccount.wallet_address` against the World ID Address Book, derives a deterministic nullifier for that verified address/action/environment/text signal, stores or refreshes the proof, and emits redacted `world_proof_created`.
9. App remains in the mini app proof-ready state and records `world_proof_ready`.
10. User explicitly taps "Post to X".

If the page is loaded outside World App or account context is unavailable, the app must fail inline or keep waiting in-app. It must not open the World mini app universal link, connector URI, X login, fallback wallet, IDKit prompt, wallet-auth prompt, or other external auth surface from the Post action.

The server accepts only account-context proof submissions. Stale `worldIdProof` and `worldWalletAuth` payloads fail closed before proof storage, and no RP proof request or wallet-auth nonce route is exposed.

## 4. Route Contracts

### 4.1 Proof Creation

`POST /api/proofs`

Headers:

| Header | Required | Purpose |
|---|---:|---|
| `content-type: application/json` | Yes | Enforce JSON body parsing. |
| `x-veripost-world-app-flow: account-context` | Required when mobile webview provenance headers are missing | Marks the logged-in World App account-context flow. |
| `x-veripost-runtime-session` | Optional | Redacted client diagnostic correlation id. |

Input:

```json
{
  "draftText": "I am posting this with VeriPost.",
  "worldAppAccount": {
    "wallet_address": "0x1111111111111111111111111111111111111111",
    "world_app_version": 4001012,
    "device_os": "ios",
    "verification_status": {
      "is_orb_verified": true
    }
  }
}
```

Processing:

1. Validate same-origin/in-app provenance and JSON body.
2. Normalize and validate `draftText`.
3. Verify `worldAppAccount.wallet_address` against the World ID Address Book.
4. Derive the proof nullifier from the verified address, configured action/environment, and normalized text signal.
5. Store the proof and emit redacted `world_proof_created`; on rejection emit only redacted code/provenance/runtime-session metadata.

### 4.2 Removed Or Trapped Routes

The active source must not expose proof-session, wallet-auth nonce, RP signing, or native IDKit proof routes/helpers:

- `src/app/api/proof-session/nonce/route.ts`
- `src/app/api/wallet-auth/nonce/route.ts`
- `src/app/api/world/wallet-auth/nonce/route.ts`
- `src/app/api/world-miniapp/wallet-auth/nonce/route.ts`
- `src/app/api/world-wallet-auth/nonce/route.ts`
- `src/app/api/world/rp-signature/route.ts`
- `src/app/api/world-proof/request/route.ts`
- `src/lib/world-wallet-auth.ts`
- `src/lib/world-idkit-proof.ts`
- `src/lib/world-id-proof.ts`

`/api/world-wallet-auth/nonce` is now stale and must be trapped by legacy auth middleware with same-origin HTTP 410 `legacy_auth_removed`.

Stale top-level and API auth document paths from World App recover in the same mini app surface with no external `Location`, including longer auth aliases such as `/authenticate`, `/authentication`, `/authorize`, `/authorization`, dashed/underscored aliases such as `/sign-in`, `/log_in`, `/world-auth`, and their `/api`, `/world`, and `/world-miniapp` variants. No-query/sparse stale auth GET/POST launches and exact mini app shell launches use a same-origin `static-fetch` recovery document with strict same-origin navigation CSP, `history.replaceState` cleanup to `/`, and a same-origin fetch of the clean root app shell, so the compose flow hydrates without serializing stale Next route state. Query-bearing stale auth launches and stale root handoffs use the same sanitized `static-fetch` recovery, avoiding top-level `window.location.replace` and callback/OAuth target values across common aliases, bare/empty auth-shaped keys such as `?auth`, `?authenticate=true`, `?authorize=true`, `?logIn=true`, `?sign_in=true`, `?callbackUrl=`, and `?walletAuth=`, and unknown keys whose values look like URL/path handoffs to stale same-origin auth paths, World deep links, World verifier/mini-app URLs, X OAuth, or other off-origin non-tweet targets. Clean World-style `?path=/` remains allowed and is logged as `safeRootPathHandoff:true` with no query values. Client-side hash recovery covers both `#?key=value` and bare `#key=value` handoff fragments, so `#oauth_callback=x.com/i/oauth2/authorize?...` is treated as a root handoff instead of being masked by the nested OAuth query string. The early and hydrated guards also block stale `history.pushState` / `history.replaceState` handoffs and recover direct `hashchange` / `popstate` stale handoff URLs after load, preserving safe app paths such as `/proof/*` while stripping redirect-capable fragments. Safe non-URL values, same-origin `/` and `/proof/*` targets, and explicit post-proof X/Twitter tweet intents remain allowed. The head-installed early guard also normalizes stale visible auth, mini app shell, root-query, and hash handoff URLs to `/` before React hydration and records a redacted early recovery diagnostic. Non-World-App stale document probes still receive a minimal static same-origin recovery page with no meta refresh, strict same-origin navigation CSP, and a same-origin `/` continue link. Non-document stale auth calls fail closed through `src/proxy.ts`; client navigation guards still trap shortcut IDKit/RP/signature/world-id paths such as `/api/idkit`, `/api/rp-signature`, `/api/sign`, `/api/world-id/*`, and world-miniapp variants.

## 5. Security Requirements

| Risk | Control |
|---|---|
| Connector/auth leaves the mini app | Do not open, assign, redirect, or call wallet-auth/IDKit/connector/X-auth/fallback-wallet surfaces from the active Post path. |
| Stale wallet-auth starts an auth prompt | Remove active wallet-auth routes and client calls; trap `/api/world-wallet-auth/nonce` and older wallet-auth route variants with same-origin 410. |
| Client-submitted account spoofing | Verify every submitted account address with the World ID Address Book before storage. This is an account-context verification path, not a cryptographic wallet-ownership signature path. |
| Fake World account payload | Reject accounts the World ID Address Book does not verify. |
| Cross-site proof creation | Require same-origin provenance or the `account-context` flow marker and reject cross-site Fetch Metadata. |
| Sensitive details leak | Do not log wallet addresses, draft text, raw nullifiers, signatures, SIWE messages, nonce values, or proof request bodies. |
| Stale redirect-capable shell survives | Keep no-store headers, root shell `Clear-Site-Data`, legacy cookie/storage purge, CacheStorage deletion, service-worker unregistration, self-unregistering `/sw.js` and `/service-worker.js` that sanitize stale auth/root/hash client URLs before activation navigation, proxy traps, CSP, early stale-location cleanup, instrumentation guard, and hydrated navigation guard. |
| Unexpected navigation | Block stale same-origin auth paths and unexpected external anchors/forms/window-open/location/navigation API attempts until the explicit post-proof X intent. Keep CSP path-scoped to `https://x.com/intent/tweet` and `https://twitter.com/intent/tweet`, not broad X host navigation. |

## 6. Non-Goals

- Automatic posting to X.
- Final X post verification in v1.
- On-chain proof publication.
- IDKit connector URL proof prompts.
- MiniKit wallet-auth, verify, sign-message, sign-typed-data, connector, fallback wallet, or browser-auth proof prompts.
- X OAuth/Auth.js login.
- Public display of wallet addresses, raw nullifiers, signatures, SIWE messages, or private verifier values.

## 7. Verification Gates

- `pnpm verify`
- `pnpm audit --audit-level moderate`
- `bash /Users/kent/.codex/skills/spectacula/scripts/spectacula validate --repo .`
- `git diff --check`
- Production route probes for health/config/proofs/stale wallet-auth nonce/stale auth routes.
- Production fake account-context probe proving `{ draftText, worldAppAccount }` reaches Address Book rejection.
- Production bundle/source scans for account-context active-flow markers and absence of connector-opening/IDKit/X-login/fallback-wallet/wallet-auth-route surfaces in the compose proof path.
- Production header probes confirming the path-scoped X/Twitter tweet-intent CSP and absence of broad X OAuth navigation allowance.
- Production probes confirming `/sw.js` and `/service-worker.js` return no-store/Clear-Site-Data/Service-Worker-Allowed headers and self-unregister/cache-delete scripts that sanitize stale auth/root/hash client URLs to `/` before controlled-client navigation.
- Production probes confirming no-query/sparse World App stale auth and exact mini app shell document entrypoints return same-origin `static-fetch` recovery without callback/OAuth target leakage, stale Next route state, or top-level `window.location.replace`; non-World-App stale auth documents return static same-origin recovery HTML with no meta refresh and strict same-origin navigation CSP; and stale non-document calls return `410 legacy_auth_removed`.
- Production log probes confirming redacted proof rejection/success metadata.

## 8. Latest Local Evidence

- Focused guard and compose regression tests passed:
  `pnpm vitest run src/lib/in-app-navigation-guard.test.ts src/lib/early-navigation-guard-script.test.ts src/components/compose-flow.test.ts --reporter=dot` with 38 tests; the existing React `act(...)` warnings and local missing-app-id warning remain.
- The focused compose regression now asserts the hydrated `world_runtime_pagehide` diagnostic fallback uses `keepalive: true` when `sendBeacon` is unavailable.
- `pnpm typecheck` passed.
- Full `pnpm verify` passed with 21 Vitest files, 207 Vitest tests, and 7 GOALS contract tests.
- Focused head-level runtime diagnostics verification passed with 115 tests across the early guard, World App runtime, compose flow, runtime diagnostics, and GOALS suites. The early guard now confirms a likely World App launch emits one redacted `world_runtime_initial` diagnostic before React hydration, without wallet or draft leakage.
- Focused auth-alias recovery verification passed with 64 tests across launch-query redaction, middleware/proxy, hydrated navigation guard, head guard, and GOALS suites. Focused dashed/underscored sign-in/log-in/world-auth alias verification passed with 64 tests across the same surfaces. Broader runtime/compose verification passed with 102 tests across legacy auth cleanup, compose, no-native-proof compose, World App runtime, runtime diagnostics, and GOALS suites.
- Focused root-query/guard/compose/GOALS verification passed with 71 tests, including fail-closed stale root query recovery for bare/empty auth-shaped keys, clean `?path=/` root launches, pre-hydration native bridge command blocking in the head script while allowing account init, and hydrated compose recovery for auth-shaped root handoffs.
- `pnpm audit --audit-level moderate`, Spectacula validation, JSON validation, and `git diff --check` passed for the account-context-only update.
- Local and production VM service-worker recovery probes confirmed stale auth paths, stale root handoff queries, and stale hash handoffs recover to `/`, while safe `/proof/*` URLs remain unchanged.
- Source uses `@worldcoin/minikit-js` only for configured startup and config-aware `MiniKit.install(appId)` account-state hydration and removes `src/app/api/world-wallet-auth/nonce/route.ts`, `src/lib/world-wallet-auth.ts`, `@worldcoin/idkit-core`, `/api/world-miniapp/wallet-auth/nonce`, `/api/world-proof/request`, `src/lib/world-idkit-proof.ts`, `src/lib/world-id-proof.ts`, native proof config/health fields, native IDKit diagnostics, and the dormant client native-IDKit bridge API. The only app-owned World App native message is the non-auth `command:"init"` state request, bounded to five attempts per app id while account context remains missing, and the bridge-first fallback is gated to World App user-agent evidence or strong MiniKit/WorldApp bridge evidence while generic ReactNative-style bridges stay passive.
- `src/lib/goals.test.ts` enforces account-context-only proof creation, Address Book verification, stale wallet-auth nonce route removal, and absence of connector/auth/IDKit/X-login request surfaces in the compose/proof path.
- Production deployment `dpl_EsifHZiSoGzi8PXnbn1tUxmouH2Y` is aliased to `https://veripost.io`.
- Production probes confirmed the root deployment marker, `X-VeriPost-Flow: world-miniapp-account-context-2026-06-01`, path-scoped CSP, config/health readiness, clean World-style `?path=/` launch rendering plus redacted `safeRootPathHandoff:true` logging, fake account-context proof rejection at Address Book verification with `world_address_unverified`, bare/empty auth-shaped root handoffs `?auth` and `?walletAuth=` returning `x-veripost-legacy-recovery: static-fetch`, longer auth aliases `/authenticate`, `/authorize`, `/api/authenticate`, `/api/authorize`, `?authorize=true`, and `?path=/authenticate`, plus dashed/underscored aliases `/sign-in`, `/log_in`, `/api/sign-in`, `/api/log_in`, `/world/sign-in`, `/world-auth`, `?logIn=true`, `?sign_in=true`, `?path=/sign-in`, and `?path=/api/log_in` recovering or failing closed in-app with no external `Location`, no middleware rewrite, strict same-origin navigation CSP, same-origin clean-root fetch, no callback/OAuth target leakage, no `window.location.replace`, and no `app-rewrite` marker. Executing the production-shipped inline early guard from live root HTML confirmed bare hash handoff `#fallback=api/auth/signin/twitter&oauth_callback=x.com/i/oauth2/authorize?...` cleans to `/?debug=world`, stale runtime history push/replace handoffs are blocked, direct stale hash mutation on `/proof/vp_123?debug=world` recovers to the same safe proof path, and `#note=world` remains allowed, with redacted diagnostics throughout.
- Browser-loaded assets include active account-context markers and configured startup evidence: `app_dc56f8eecb48c4d395981ec1ca5c6329`, `__without_app_id__`, `world_account_context_pending`, `world_account_check_started`, `world_account_context_detected`, `world_proof_request_started`, `world_proof_ready`, `waitForWorldAppAccountRuntime`, `addresses`, `walletAddress`, `MiniKit.install`, `command:"init"`, `payload:{version:1,minorVersion:96}`, `MiniKitAndroid`, `WorldAppAndroid`, `ReactNativeWebView`, `/api/runtime-diagnostics`, `world_runtime_initial`, `authenticate|authentication|authorize|authorization`, `sign-in`, `log_in`, `world-auth`, `veripost:minikit-command-blocked`, `minikit-command=blocked`, `veripost:native-command-blocked`, `native-command=blocked`, `early_native_command`, `veripost.native-post-message-guarded`, `isLegacyAuthTriggerQueryKey`, `safeRootPathHandoff`, `authTriggerKeys`, and `keepalive`, including the configured-app-id startup official MiniKit account-state initializer, bridge-first raw init path for strong World App native bridge surfaces, fail-closed MiniKit command guard, hydrated direct native bridge command guard, pre-hydration direct native bridge command guard, head-level runtime initial diagnostic, longer auth-alias recovery, dashed/underscored stale auth-alias recovery, and redacted root-launch query logger. The source marker `BUILD_TIME_WORLD_APP_ID` and helper name `hasLikelyWorldAppNativeTransport` are minified out of production browser assets, while the app id literal and native bridge markers confirm the production value and bridge-first path were bundled. Loaded chunks remain absent for `/api/world-proof/request` and `ethereum.request`.
- Production-source scans confirm the active compose/proof path does not call `MiniKit.walletAuth`, `walletAuth`, `command:"wallet-auth"`, `command:"sign-message"`, `command:"sign-typed-data"`, `miniapp-wallet-auth`, `world_wallet_auth_started`, `world_wallet_auth_ready`, X OAuth, IDKit, `MiniKitProvider`, connector-opening calls, `/api/world-proof/request`, `requestNativeWorldIdProof`, Wagmi fallback, `ethereum.request`, or signer-bypass material. Browser assets may contain unused SDK command implementations from `@worldcoin/minikit-js`; verification distinguishes dependency code from app-owned proof-flow calls.
- Executing the production-shipped inline early guard from live root HTML confirmed pre-hydration `command:"init"` reaches a native bridge injected after the head script, stale `command:"wallet-auth"` is dropped with `veripost:native-command-blocked`, and a redacted `early_native_command` diagnostic is queued.
- Executing the production-shipped inline early guard from live root HTML in a browser-like DOM with a synthetic World App user agent produced a production `world_runtime_initial` log at 2026-06-01T11:40:24Z with `phase:"loading"`, `worldAppUserAgent:true`, `walletAddress:"missing"`, no draft text, and no wallet/address payload fields. This confirms the head-level diagnostic can reach production before React hydration, but it is synthetic and not real-device proof evidence.
- Redacted Vercel logs for the current deployment include clean root launch logging with no query, stale path aliases `/sign-in`, `/log_in`, `/api/sign-in`, `/api/log_in`, `/world/sign-in`, and `/world-auth` trapped as path-source `legacy_auth_entrypoint_blocked`, stale root auth-trigger launches `?logIn=true` and `?sign_in=true` plus root handoffs `?path=/sign-in`, `?path=/api/log_in`, and `?next=/world/sign-in` trapped with only redacted query keys, fake account-context proof rejection with `world_address_unverified`, and no real-device `world_account_context_detected`, `world_proof_ready`, or `world_proof_created` entries yet.
- A public World listing probe at 2026-06-01T11:16:52Z confirmed the canonical `world.org/mini-app` launch URL resolves through `world.org/ecosystem/app_dc56f8eecb48c4d395981ec1ca5c6329?path=%2F`, still contains stale "Log in with X" / "complete a private World ID proof" listing copy, and does not expose `veripost.io` or auth callback markers in the public HTML.

## 9. Remaining Completion Evidence

Completion requires running a production device test that opens from World App, taps Post, stays in the mini app, uses the already logged-in World App account context without wallet-auth, fallback wallet, IDKit prompt, external auth, connector navigation, or redirect commands, reaches proof-ready, and produces `world_account_context_detected`, `world_proof_ready`, and `world_proof_created` in production logs.

The public World ecosystem listing metadata also remains a review/submission follow-up: update it through the Developer Portal so the external listing matches the current account-context proof flow.

## 10. Explicit Tradeoff

The current implementation favors the user's requirement that proof creation use the already logged-in World App account without a wallet-auth prompt that can leave the mini app. The backend verifies the submitted address through the World ID Address Book, but the account-context-only path does not cryptographically bind the submitted account with a fresh wallet-auth signature.
