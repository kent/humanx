import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(filePath: string): string {
  return readFileSync(path.join(process.cwd(), filePath), "utf8");
}

describe("GOALS.md contract", () => {
  it("keeps the product scope to the five simple user stories", () => {
    expect(readProjectFile("GOALS.md")).toBe(`# veripost

## User Stories

1. Load app.
2. Enter text to post in World App.
3. Press Post.
4. Use the logged-in World ID inside World App.
5. Post tweet with verified human proof.
`);
  });

  it("publishes current mini app metadata without stale redirect-auth copy", () => {
    const layout = readProjectFile("src/app/layout.tsx");
    const nextConfig = readProjectFile("next.config.ts");
    const manifest = JSON.parse(readProjectFile("public/manifest.json")) as {
      description?: string;
      icons?: Array<{ src?: string }>;
      screenshots?: Array<{ src?: string }>;
      start_url?: string;
    };
    const serializedManifest = JSON.stringify(manifest);

    expect(layout).toContain('manifest: "/manifest.json"');
    expect(nextConfig).toContain('source: "/manifest.json"');
    expect(manifest.start_url).toBe("/");
    expect(manifest.description).toBe(
      "Create a proof for an X post from your logged-in World App account, with no separate sign-in.",
    );
    expect(manifest.icons?.map((icon) => icon.src)).toEqual(expect.arrayContaining([
      "/app-icon.png",
      "/app-icon.svg",
    ]));
    expect(manifest.screenshots?.map((screenshot) => screenshot.src)).toEqual(expect.arrayContaining([
      "/screenshots/01-compose-open.png",
      "/screenshots/02-compose-world-app.png",
      "/screenshots/03-creating-proof.png",
    ]));
    expect(serializedManifest).toContain("logged-in World App account");
    expect(serializedManifest).not.toContain("external auth");
    expect(serializedManifest).not.toContain("Log in with X");
    expect(serializedManifest).not.toContain("Login with X");
    expect(serializedManifest).not.toContain("complete a private World ID proof");
    expect(serializedManifest).not.toContain("wallet-auth");
    expect(serializedManifest).not.toContain("connector");
  });

  it("keeps the compose flow inside World App until X posting", () => {
    const composeFlow = readProjectFile("src/components/compose-flow.tsx");
    const page = readProjectFile("src/app/page.tsx");
    const layout = readProjectFile("src/app/layout.tsx");
    const worldAppRuntime = readProjectFile("src/lib/world-app-runtime.ts");
    const worldProofRoute = readProjectFile("src/app/api/proofs/route.ts");
    const worldProofRpContextRoute = readProjectFile("src/app/api/world-proof/rp-context/route.ts");
    const worldAccountVerifier = readProjectFile("src/lib/world-account.ts");
    const worldIdKitClient = readProjectFile("src/lib/world-idkit-client.ts");
    const worldIdKitServer = readProjectFile("src/lib/world-idkit-server.ts");
    const worldMiniAppAuth = readProjectFile("src/lib/world-miniapp-auth.ts");
    const configFile = readProjectFile("src/lib/config.ts");
    const packageJson = readProjectFile("package.json");
    const productionEnvPreflight = readProjectFile("scripts/check-production-env.mjs");
    const worldProofFlow =
      page +
      layout +
      composeFlow +
      worldAppRuntime +
      worldProofRoute +
      worldProofRpContextRoute +
      worldAccountVerifier +
      worldIdKitClient +
      worldIdKitServer +
      worldMiniAppAuth +
      packageJson;
    const clientWorldProofFlow =
      page +
      layout +
      composeFlow +
      worldAppRuntime +
      worldIdKitClient +
      worldMiniAppAuth +
      packageJson;

    expect(layout).not.toContain("Providers");
    expect(layout).not.toContain("MiniKitProvider");
    expect(composeFlow).toContain("refreshWorldAppContext(config.appId)");
    expect(composeFlow).toContain("/api/world-proof/rp-context");
    expect(composeFlow).toContain("requestNativeWorldIdKitProof");
    expect(composeFlow).toContain("readWorldIdKitRpContext");
    expect(composeFlow).not.toContain("requestWorldWalletAuth");
    expect(composeFlow).not.toContain("MiniKit.walletAuth");
    expect(composeFlow).not.toContain('fallback: () =>');
    expect(composeFlow).toContain("Preparing in-app World ID proof.");
    expect(composeFlow).toContain("Waiting for World App proof runtime.");
    expect(composeFlow).toContain("postButtonLabel");
    expect(composeFlow).toContain("Checking World");
    expect(composeFlow).toContain("Creating proof");
    expect(composeFlow).toContain('role="alert"');
    expect(composeFlow).toContain('role="status"');
    expect(composeFlow).toContain("aria-busy={busy}");
    expect(composeFlow).toContain("parseSavedProofResult");
    expect(composeFlow).toContain("isSavedProofVisibleForDraft");
    expect(composeFlow).toContain("hasWorldAppAccount");
    expect(composeFlow).toContain("BUILD_TIME_WORLD_APP_ID");
    expect(composeFlow).toContain("primeWorldAppRuntime(BUILD_TIME_WORLD_APP_ID)");
    expect(composeFlow).not.toContain("hasNativeWorldProofTransport");
    expect(composeFlow).not.toContain("PASSIVE_WORLD_APP_CONTEXT_REFRESH");
    expect(composeFlow).not.toContain("allowStateInit: false");
    expect(composeFlow).not.toContain("installMiniKitBridge: false");
    expect(composeFlow).toContain("idkitResponse");
    expect(composeFlow).toContain("worldAccountPresent");
    expect(composeFlow).toContain("getWorldRuntimeDiagnostics");
    expect(composeFlow).toContain("getWorldRuntimeDiagnosticsDisplay");
    expect(composeFlow).toContain("World proof trace");
    expect(composeFlow).toContain("worldProofTrace");
    expect(composeFlow).toContain("createWorldProofTraceEntry");
    expect(composeFlow).toContain("reportWorldRuntimeDiagnostics");
    expect(composeFlow).toContain("sendBeacon");
    expect(composeFlow).toContain("sessionId");
    expect(composeFlow).toContain("runtimeSessionId");
    expect(composeFlow).toContain("world_account_context_detected");
    expect(composeFlow).toContain("world_account_context_pending");
    expect(composeFlow).toContain("world_account_check_started");
    expect(composeFlow).not.toContain("world_wallet_auth_started");
    expect(composeFlow).not.toContain("world_wallet_auth_ready");
    expect(composeFlow).not.toContain("world_app_state_init_sent");
    expect(composeFlow).toContain("world_idkit_native_started");
    expect(composeFlow).toContain("world_idkit_connector_blocked");
    expect(composeFlow).toContain("world_idkit_native_failed");
    expect(composeFlow).not.toContain("world_idkit_native_command_sent");
    expect(composeFlow).not.toContain("world_idkit_native_prepared");
    expect(composeFlow).not.toContain("world_idkit_native_request_created");
    expect(composeFlow).not.toContain("world_idkit_rp_context_ready");
    expect(composeFlow).not.toContain("world_idkit_native_ready");
    expect(composeFlow).not.toContain("world_native_command_blocked");
    expect(composeFlow).toContain("native-command=blocked");
    expect(composeFlow).toContain("veripost:native-command-blocked");
    expect(composeFlow).toContain("world_proof_ready");
    expect(composeFlow).toContain("world_proof_request_started");
    expect(composeFlow).toContain("world_runtime_pagehide");
    expect(composeFlow).toContain("world_runtime_visibility_hidden");
    expect(composeFlow).toContain("world_runtime_loaded");
    expect(composeFlow).toContain('get("debug") === "world"');
    expect(composeFlow).toContain('phase === "error"');
    expect(composeFlow).toContain("World runtime diagnostics");
    expect(composeFlow).toContain("/api/runtime-diagnostics");
    expect(page).toContain("world_page_request");
    expect(page).toContain("worldApp:");
    expect(composeFlow).toContain('disabled={busy || phase === "loading"}');
    expect(composeFlow).toContain('credentials: "same-origin"');
    expect(composeFlow).toContain('"x-veripost-runtime-session": WORLD_RUNTIME_DIAGNOSTIC_SESSION_ID');
    expect(composeFlow).toContain('"x-veripost-world-app-flow": worldProofPayload.flow');
    expect(composeFlow).toContain("flow: WORLD_MINIAPP_AUTH_FLOW");
    expect(composeFlow).toContain("requestNativeWorldIdKitProof");
    expect(composeFlow).not.toContain("requestNativeWorldIdProof");
    expect(composeFlow).not.toContain("createWorldIdProofRequest");
    expect(composeFlow).not.toContain("/api/world-proof/request");
    expect(composeFlow).not.toContain("flow: WORLD_MINIAPP_IDKIT_FLOW");
    expect(composeFlow).not.toContain("worldIdProof");
    expect(composeFlow).toContain("proofResult && canShowLastProof");
    expect(composeFlow).toContain("/api/proofs");
    expect(composeFlow).not.toContain("hasWorldIdProofConfig");
    expect(composeFlow).toContain("World ID proof check needs Mini App and RP configuration.");
    expect(composeFlow).not.toContain("Waiting for World App proof bridge.");
    expect(composeFlow).toContain("hasProofStorageConfig");
    expect(composeFlow).toContain("Proof ready. Post to X when you are ready.");
    expect(composeFlow).toContain("onClick={handlePrimaryAction}");
    expect(composeFlow).toContain("href={proofResult.tweetIntentUrl}");
    expect(composeFlow).toContain("disabled={!canPost}");
    expect(composeFlow).not.toContain("requestWorldMiniAppWalletAuth");
    expect(composeFlow).not.toContain("worldMiniAppWalletAuth");
    expect(composeFlow).not.toContain("world_wallet_auth_started");
    expect(composeFlow).not.toContain("world_wallet_auth_ready");
    expect(composeFlow).not.toContain("Authenticating");
    expect(composeFlow).not.toContain("buildWorldMiniAppUrl");
    expect(composeFlow).not.toContain("Open in World App");
    expect(composeFlow).not.toContain("world.org/mini-app");
    expect(composeFlow).not.toContain("canOpenWorldApp");
    expect(composeFlow).not.toContain("openWorldApp");

    expect(worldAppRuntime).toContain("hasWorldAppRuntime()");
    expect(worldAppRuntime).toContain("hasNativeWorldAppTransport() ||");
    expect(worldAppRuntime).toContain("hasWorldAppUserAgent()");
    expect(worldAppRuntime).toContain("initializeWorldAppRuntime");
    expect(worldAppRuntime).toContain("primeWorldAppRuntime");
    expect(worldAppRuntime).toContain("getWorldAppAccountSnapshot");
    expect(worldAppRuntime).toContain("getWorldAppAccountSource");
    expect(worldAppRuntime).toContain("waitForWorldAppAccountRuntime");
    expect(worldAppRuntime).not.toContain("prepareWorldIdKitNativeBridge");
    expect(worldAppRuntime).not.toContain("IDKIT_NATIVE");
    expect(worldAppRuntime).not.toContain("miniapp-verify-action");
    expect(worldAppRuntime).not.toContain("NativeVerify");
    expect(worldAppRuntime).not.toContain("getWorldIdKitBridgeDiagnostics");
    expect(worldAppRuntime).not.toContain("verifyCommandVersion");
    expect(worldAppRuntime).toContain("installPassiveWorldAppContextListeners");
    expect(worldAppRuntime).toContain("capturePassiveWorldAppContext");
    expect(worldAppRuntime).toContain("world_app_message");
    expect(worldAppRuntime).toContain('nativeWindow.addEventListener?.("message"');
    expect(worldAppRuntime).toContain('nativeDocument?.addEventListener?.("message"');
    expect(worldAppRuntime).toContain("isAcceptedPassiveMessageOrigin");
    expect(worldAppRuntime).toContain("WORLD_APP_PASSIVE_MESSAGE_ORIGINS");
    expect(worldAppRuntime).toContain("WORLD_APP_PASSIVE_WORLD_ORIGIN");
    expect(worldAppRuntime).toContain("WORLD_APP_PASSIVE_WORLDCOIN_ORIGIN");
    expect(worldAppRuntime).not.toContain("https://worldcoin.org");
    expect(worldAppRuntime).toContain("PASSIVE_ACCOUNT_CONTEXT_KEYS");
    expect(worldAppRuntime).toContain('origin === "null"');
    expect(worldAppRuntime).toContain("wallet_address");
    expect(worldAppRuntime).toContain("walletAddress");
    expect(worldAppRuntime).toContain("verificationStatus");
    expect(worldAppRuntime).toContain("launchLocation");
    expect(worldAppRuntime).toContain("openOrigin");
    expect(worldAppRuntime).toContain("worldAppKeys");
    expect(worldAppRuntime).toContain("worldAppShapeKeys");
    expect(worldAppRuntime).toContain("miniKitUserKeys");
    expect(worldAppRuntime).toContain("SECONDARY_WORLD_APP_GLOBAL_KEYS");
    expect(worldAppRuntime).toContain("WORLD_APP_IOS_MESSAGE_HANDLER_KEYS");
    expect(worldAppRuntime).toContain("WORLD_APP_ANDROID_POST_MESSAGE_KEYS");
    expect(worldAppRuntime).toContain("WORLD_APP_PASSIVE_CONTEXT_EVENT_NAMES");
    expect(worldAppRuntime).toContain("worldID");
    expect(worldAppRuntime).toContain("WorldID");
    expect(worldAppRuntime).toContain("ReactNativeWebView");
    expect(worldAppRuntime).toContain('@worldcoin/minikit-js');
    expect(worldAppRuntime).toContain("OfficialMiniKit.install");
    expect(worldAppRuntime).toContain("maybeInstallOfficialMiniKit");
    expect(worldAppRuntime).not.toContain("MiniKitProvider");
    expect(worldAppRuntime).toContain("nativeWindow?.MiniKit");
    expect(worldAppRuntime).not.toContain("installMiniKitRuntimeBridgeForApp");
    expect(worldAppRuntime).not.toContain("createMiniKitEventBridge");
    expect(worldAppRuntime).not.toContain("sendMiniKitBridgeInit");
    expect(worldAppRuntime).not.toContain("Object.defineProperty(nativeWindow, \"MiniKit\"");
    expect(worldAppRuntime).toContain("getDirectWorldAppPayload(nativeWindow)");
    expect(worldAppRuntime).toContain("sendWorldAppStateInit");
    expect(worldAppRuntime).toContain("installWorldAppNativeCommandGuard");
    expect(worldAppRuntime).toContain("__veripostAllowNativeWorldIdkitVerifyUntil");
    expect(worldAppRuntime).toContain("veripost:native-command-blocked");
    expect(worldAppRuntime).toContain("getNativeCommandName");
    expect(worldAppRuntime).not.toContain("WORLD_APP_STATE_INIT_RUNTIME_KEY");
    expect(worldAppRuntime).toContain("WORLD_APP_MINIKIT_INIT_VERSION");
    expect(worldAppRuntime).toContain("WORLD_APP_STATE_INIT_RETRY_MS");
    expect(worldAppRuntime).toContain("WORLD_APP_STATE_INIT_MAX_ATTEMPTS");
    expect(worldAppRuntime).not.toContain("WORLD_APP_INIT_RETRY_MS");
    expect(worldAppRuntime).not.toContain("WORLD_APP_INIT_MAX_ATTEMPTS");
    expect(worldAppRuntime).toContain('command: "init"');
    expect(worldAppRuntime).toContain(".postMessage?.(");
    expect(worldAppRuntime).toContain("worldAppInit");
    expect(worldAppRuntime).not.toContain("getWorldAppStateContainerStatus");
    expect(worldAppRuntime).toContain('"skipped"');
    expect(worldAppRuntime).toContain('transport: "missing"');
    expect(worldAppRuntime).toContain('stateContainer: "missing"');
    expect(worldAppRuntime).toContain("WorldAppWalletProviderLike");
    expect(worldAppRuntime).toContain("ethereum?: WorldAppWalletProviderLike");
    expect(worldAppRuntime).toContain("selectedAddress");
    expect(worldAppRuntime).toContain("getWalletProviderWalletAddress");
    expect(worldAppRuntime).toContain("getWalletProviderAccountLike");
    expect(worldAppRuntime).toContain("hasWorldAppSurfaceEvidence");
    expect(worldAppRuntime).toContain('"wallet_provider"');
    expect(worldAppRuntime).not.toMatch(/nativeWindow\.MiniKit\s=[^=]/);
    expect(worldAppRuntime).not.toContain("commands:");
    expect(worldAppRuntime).not.toContain('command: "wallet-auth"');
    expect(worldAppRuntime).not.toContain('command: "sign-message"');
    expect(worldAppRuntime).not.toContain('command: "sign-typed-data"');
    expect(worldAppRuntime).not.toContain("eth_requestAccounts");
    expect(worldAppRuntime).not.toContain("requestAccounts");
    expect(worldAppRuntime).not.toContain("ethereum.request");
    expect(worldAppRuntime).not.toContain("wallet_requestPermissions");
    expect(worldAppRuntime).not.toContain("MiniKitProvider");
    expect(worldAppRuntime).not.toContain("MiniKit.isInstalled()");
    expect(worldAppRuntime).not.toContain("MiniKit.walletAuth");
    expect(worldAppRuntime).not.toContain("MiniKit.signMessage");
    expect(worldAppRuntime).not.toContain("MiniKit.signTypedData");
    expect(worldAppRuntime).not.toContain("waitForWorldAppNativeCommandRuntime");
    expect(worldAppRuntime).not.toContain("assertMiniKitWalletAuthReady");
    expect(worldAppRuntime).not.toContain("walletAuthCommand");

    expect(existsSync(path.join(process.cwd(), "src/lib/world-id-client.ts"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "src/lib/world-id-proof.ts"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "src/lib/world-idkit-proof.ts"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "src/lib/world-id-native.ts"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "src/lib/world-miniapp-auth-client.ts"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "src/lib/world-miniapp-auth-server.ts"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "src/app/api/world-miniapp/wallet-auth/nonce/route.ts"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "src/app/api/world/rp-signature/route.ts"))).toBe(false);
    expect(worldAccountVerifier).toContain("addressVerifiedUntil");
    expect(worldAccountVerifier).toContain("verifyWorldAppAccount");
    expect(worldAccountVerifier).toContain("world_app_account_address_book");
    expect(worldAccountVerifier).not.toContain("verifyWorldMiniAppWalletAuth");
    expect(worldAccountVerifier).not.toContain("parseSiweMessage");
    expect(worldAccountVerifier).not.toContain("recoverMessageAddress");
    expect(worldAccountVerifier).not.toContain("isValidSignature");
    expect(worldMiniAppAuth).toContain('WORLD_MINIAPP_AUTH_FLOW = "idkit-native"');
    expect(worldMiniAppAuth).not.toContain("WORLD_MINIAPP_IDKIT_FLOW");
    expect(worldMiniAppAuth).toContain("world-miniapp-idkit-native-2026-06-01");

    expect(packageJson).toContain("@worldcoin/minikit-js");
    expect(packageJson).toContain("@worldcoin/idkit-core");
    expect(packageJson).toContain('"verify:production-env"');
    expect(packageJson).toContain('"deploy:production"');
    expect(productionEnvPreflight).toContain("WORLD_ID_RP_ID");
    expect(productionEnvPreflight).toContain("WORLD_ID_RP_SIGNING_KEY");
    expect(productionEnvPreflight).toContain("Production deploy preflight failed.");
    expect(worldProofFlow).toContain("@worldcoin/idkit-core");
    expect(worldProofFlow).not.toContain("MiniKitProvider");
    expect(worldProofFlow).not.toContain("MiniKit.walletAuth");
    expect(worldProofFlow).not.toContain("worldWalletAuth");
    expect(worldProofFlow).not.toContain("verifyWorldWalletAuthRequest");
    expect(worldProofFlow).not.toContain("result.executedWith");
    expect(worldProofFlow).not.toContain("/api/proof-session/nonce");
    expect(worldProofFlow).not.toContain("/api/world-wallet-auth/nonce");
    expect(worldProofFlow).not.toContain("/api/world-miniapp/wallet-auth/nonce");
    expect(worldProofFlow).not.toContain("/api/world/wallet-auth/nonce");
    expect(worldProofFlow).not.toContain("/api/wallet-auth/nonce");
    expect(worldProofFlow).not.toContain("MiniKit.signMessage");
    expect(worldProofFlow).not.toContain("MiniKit.signTypedData");
    expect(worldProofFlow).not.toContain('command: "sign-message"');
    expect(worldProofFlow).not.toContain('command: "wallet-auth"');
    expect(worldProofFlow).not.toContain("/api/world/sign/nonce");
    expect(worldProofFlow).not.toContain("IDKitRequestWidget");
    expect(worldProofFlow).not.toContain("https://world.org/verify");
    expect(worldProofFlow).toContain("requestNativeWorldIdKitProof");
    expect(worldProofFlow).not.toContain("requestNativeWorldIdProof");
    expect(worldProofFlow).not.toContain("verifyWorldIdProof");
    expect(worldProofFlow).toContain("idkitResponse");
    expect(worldProofFlow).toContain("require_user_presence: true");
    expect(worldProofFlow).toContain("request.connectorURI");
    expect(worldProofFlow).toContain("external connector");
    expect(worldProofFlow).not.toContain("verifyNativeWorldIdProof");
    expect(worldProofFlow).toContain("idkit-native");
    expect(composeFlow).not.toContain("requestNativeWorldIdProof");
    expect(worldIdKitClient).toContain("require_user_presence: true");
    expect(worldIdKitClient).toContain("request.connectorURI");
    expect(clientWorldProofFlow).not.toContain("/api/world/rp-signature");
    expect(clientWorldProofFlow).not.toContain("x-vercel-protection-bypass");
    expect(configFile).not.toContain("/api/world/rp-signature");
    expect(configFile).not.toContain("RECOVERED_WORLD_RP_SIGNATURE_PROXY_URL");
    expect(existsSync(path.join(process.cwd(), "src/app/api/world-proof/request/route.ts"))).toBe(false);
    expect(worldProofFlow).not.toContain("window.location.assign(request.connectorURI)");
    expect(worldProofFlow).not.toContain("window.open(request.connectorURI");
    expect(worldProofFlow).not.toContain("window.location.href = request.connectorURI");
    expect(worldProofFlow).not.toContain("window.location.assign(buildWorldMiniAppUrl");
    expect(worldProofFlow).not.toContain("window.location.assign(payload.tweetIntentUrl)");
    expect(worldProofFlow).not.toContain("window.location.assign(");
    expect(worldProofFlow).not.toContain("return_to");
    expect(worldProofFlow).not.toContain('signIn("twitter")');
    expect(worldProofFlow).not.toContain("Login with X");
    expect(worldProofFlow).not.toContain("/api/world/auth");
    expect(worldProofFlow).not.toContain("xPostUrl");
    expect(worldProofFlow).not.toContain("editToken");
  });

  it("creates proofs from native in-app IDKit without redirect auth", () => {
    const proofRoute = readProjectFile("src/app/api/proofs/route.ts");
    const accountVerifier = readProjectFile("src/lib/world-account.ts");
    const idkitServer = readProjectFile("src/lib/world-idkit-server.ts");
    const rpContextRoute = readProjectFile("src/app/api/world-proof/rp-context/route.ts");

    expect(proofRoute).not.toContain("verifyWorldIdProof");
    expect(proofRoute).not.toContain("worldIdProof");
    expect(proofRoute).not.toContain("WORLD_MINIAPP_IDKIT_FLOW");
    expect(proofRoute).not.toContain("world_id_proof_required");
    expect(proofRoute).toContain("verifyWorldIdKitProof");
    expect(proofRoute).toContain("idkitResponse");
    expect(proofRoute).toContain("allowMissingProvenanceHeader");
    expect(proofRoute).toContain("WORLD_MINIAPP_AUTH_HEADER");
    expect(proofRoute).toContain("WORLD_MINIAPP_AUTH_FLOW");
    expect(proofRoute).toContain("accountContext");
    expect(proofRoute).not.toContain("verifyWorldWalletAuthRequest");
    expect(proofRoute).not.toContain("worldWalletAuth");
    expect(proofRoute).not.toContain("verifyWorldMiniAppWalletAuth");
    expect(proofRoute).not.toContain("worldMiniAppWalletAuth");
    expect(proofRoute).not.toContain("assertWorldMiniAppAuthChallenge");
    expect(proofRoute).not.toContain("serializeWorldMiniAppAuthCookie");
    expect(proofRoute).not.toContain("verifyNativeWorldIdProof");
    expect(proofRoute).not.toContain("native-idkit");
    expect(idkitServer).toContain("verifyWorldIdKitProof");
    expect(idkitServer).toContain("https://developer.world.org/api/v4/verify");
    expect(idkitServer).toContain("hashSignal(signal)");
    expect(idkitServer).toContain("user_presence_completed");
    expect(idkitServer).toContain("createWorldIdKitRpContext");
    expect(rpContextRoute).toContain("createWorldIdKitRpContext");
    expect(rpContextRoute).toContain("allowMissingProvenanceHeader");
    expect(proofRoute).not.toContain("signedMessage");
    expect(proofRoute).not.toContain("WORLD_SIGN_NONCE_COOKIE");
    expect(proofRoute).not.toContain("readWorldAuthSession");
    expect(proofRoute).not.toContain("getServerSession");
    expect(proofRoute).not.toContain("x_login_required");
    expect(accountVerifier).toContain("addressVerifiedUntil");
    expect(accountVerifier).toContain("world_app_account_address_book");
    expect(existsSync(path.join(process.cwd(), "src/lib/world-id-proof.ts"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "src/app/api/world-proof/request/route.ts"))).toBe(false);
  });

  it("does not expose a redirect-capable auth route outside the mini app", () => {
    const files =
      readProjectFile("src/components/compose-flow.tsx") +
      readProjectFile("src/app/api/proofs/route.ts") +
      readProjectFile("src/lib/world-miniapp-auth.ts");

    expect(files).not.toContain("/api/auth");
    expect(existsSync(path.join(process.cwd(), "src/app/api/proof-session/nonce/route.ts"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "src/app/api/world-wallet-auth/nonce/route.ts"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "src/app/api/wallet-auth/nonce/route.ts"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "src/app/api/world/wallet-auth/nonce/route.ts"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "src/app/api/world-miniapp/wallet-auth/nonce/route.ts"))).toBe(false);
    expect(files).not.toContain("/api/world/wallet-auth/nonce");
    expect(files).not.toContain("/api/world-miniapp/wallet-auth/nonce");
    expect(files).not.toContain("/api/world-wallet-auth/nonce");
    expect(files).not.toContain("world.org/mini-app");
    expect(files).not.toContain("request.connectorURI");
    expect(files).not.toContain("window.open");
    expect(files).not.toContain("window.location.assign(request.connectorURI)");
    expect(files).not.toContain("window.open(request.connectorURI");
    expect(existsSync(path.join(process.cwd(), "src/app/api/world/rp-signature/route.ts"))).toBe(false);
  });

  it("logs World runtime diagnostics without accepting private account or draft fields", () => {
    const diagnosticsRoute = readProjectFile("src/app/api/runtime-diagnostics/route.ts");

    expect(diagnosticsRoute).toContain("assertDiagnosticRequestProvenance");
    expect(diagnosticsRoute).toContain("assertJsonRequest");
    expect(diagnosticsRoute).toContain("rateLimitRequest");
    expect(diagnosticsRoute).toContain("world_runtime_diagnostics");
    expect(diagnosticsRoute).toContain("world_runtime_initial");
    expect(diagnosticsRoute).toContain("world_runtime_loaded");
    expect(diagnosticsRoute).toContain("world_account_check_started");
    expect(diagnosticsRoute).toContain("world_account_context_pending");
    expect(diagnosticsRoute).not.toContain("world_app_state_init_sent");
    expect(diagnosticsRoute).toContain("world_account_context_detected");
    expect(diagnosticsRoute).toContain("world_idkit_native_started");
    expect(diagnosticsRoute).toContain("world_idkit_connector_blocked");
    expect(diagnosticsRoute).toContain("world_idkit_native_failed");
    expect(diagnosticsRoute).not.toContain("world_idkit_native_command_sent");
    expect(diagnosticsRoute).not.toContain("world_idkit_native_prepared");
    expect(diagnosticsRoute).not.toContain("world_idkit_native_request_created");
    expect(diagnosticsRoute).not.toContain("world_idkit_rp_context_ready");
    expect(diagnosticsRoute).not.toContain("world_idkit_native_ready");
    expect(diagnosticsRoute).not.toContain("world_native_command_blocked");
    expect(diagnosticsRoute).toContain("world_proof_ready");
    expect(diagnosticsRoute).toContain("world_proof_request_started");
    expect(diagnosticsRoute).toContain("world_runtime_pagehide");
    expect(diagnosticsRoute).toContain("world_runtime_visibility_hidden");
    expect(diagnosticsRoute).toContain("sessionId");
    expect(diagnosticsRoute).toContain("walletAddress");
    expect(diagnosticsRoute).toContain("accountSource");
    expect(diagnosticsRoute).toContain("worldAppKeys");
    expect(diagnosticsRoute).toContain("worldAppShapeKeys");
    expect(diagnosticsRoute).toContain("worldAppInit");
    expect(diagnosticsRoute).not.toContain("idKitBridge");
    expect(diagnosticsRoute).not.toContain("verifyCommandVersion");
    expect(diagnosticsRoute).toContain("attempts");
    expect(diagnosticsRoute).toContain("transport");
    expect(diagnosticsRoute).toContain("stateContainer");
    expect(diagnosticsRoute).toContain(".strict()");
    expect(diagnosticsRoute).not.toContain("world_wallet_auth_started");
    expect(diagnosticsRoute).not.toContain("world_wallet_auth_ready");
    expect(diagnosticsRoute).not.toContain("walletAuthCommand");
    expect(diagnosticsRoute).not.toContain("nativeVerify");
    expect(diagnosticsRoute).not.toContain("world_id_native_proof_started");
    expect(diagnosticsRoute).not.toContain("supportedCommands");
    expect(diagnosticsRoute).not.toContain("worldAppWalletAuth");
    expect(diagnosticsRoute).not.toContain("signature");
    expect(diagnosticsRoute).not.toContain("nonce");
    expect(diagnosticsRoute).not.toContain("wallet_address");
    expect(diagnosticsRoute).not.toContain("draftText");
    expect(diagnosticsRoute).not.toContain("worldAppAccount");
    expect(diagnosticsRoute).not.toContain("idkitResponse");
    expect(diagnosticsRoute).not.toContain("tweetIntentUrl");
  });

  it("prevents the World App webview from reusing a stale redirect-capable app shell", () => {
    const nextConfig = readProjectFile("next.config.ts");
    const composeFlow = readProjectFile("src/components/compose-flow.tsx");
    const inAppNavigationGuard = readProjectFile("src/lib/in-app-navigation-guard.ts");
    const earlyNavigationGuardRuntime = readProjectFile("src/lib/early-navigation-guard-runtime.ts");
    const earlyNavigationGuardScript = readProjectFile("src/lib/early-navigation-guard-script.ts");
    const instrumentationClient = readProjectFile("src/instrumentation-client.ts");
    const layout = readProjectFile("src/app/layout.tsx");
    const legacyAuthState = readProjectFile("src/lib/legacy-auth-state.ts");
    const serviceWorkerKillSwitch = readProjectFile("public/sw.js");
    const legacyServiceWorkerKillSwitch = readProjectFile("public/service-worker.js");
    const proxy = readProjectFile("src/proxy.ts");

    expect(nextConfig).toContain("Cache-Control");
    expect(nextConfig).toContain("no-store, max-age=0, must-revalidate");
    expect(nextConfig).toContain("Clear-Site-Data");
    expect(nextConfig).toContain('"cache"');
    expect(nextConfig).toContain('"cookies"');
    expect(nextConfig).toContain('"storage"');
    expect(nextConfig).toContain("X-VeriPost-Flow");
    expect(nextConfig).toContain("world-miniapp-idkit-native-2026-06-01");
    expect(nextConfig).toContain("https://x.com/intent/tweet");
    expect(nextConfig).toContain("https://twitter.com/intent/tweet");
    expect(nextConfig).not.toContain("https://x.com https://twitter.com");
    expect(nextConfig).toContain("const apiHeaders");
    expect(nextConfig).toContain("serviceWorkerPurgeHeaders");
    expect(nextConfig).toContain('source: "/sw.js"');
    expect(nextConfig).toContain('source: "/service-worker.js"');
    expect(nextConfig).toContain("Service-Worker-Allowed");
    expect(nextConfig).toContain('source: "/"');
    expect(nextConfig).toContain('source: "/api/:path*"');
    expect(nextConfig).toContain("headers: apiHeaders");
    expect(composeFlow).toContain("purgeLegacyBrowserAuthState()");
    expect(composeFlow).toContain("consumeLegacyEntrypointLocation");
    expect(composeFlow).toContain("legacy-auth");
    expect(composeFlow).toContain("legacy-miniapp");
    expect(composeFlow).toContain("stale sign-in handoff");
    expect(composeFlow).not.toContain("No authentication is needed");
    expect(composeFlow).not.toContain("stale authentication redirect");
    expect(composeFlow).toContain("stale mini app entry path");
    expect(composeFlow).toContain("drainEarlyBlockedNavigationAttempts");
    expect(composeFlow).toContain("__veripostAllowPostProofNavigation");
    expect(composeFlow).toContain("__veripostEarlyBlockedNavigations");
    expect(composeFlow).toContain("world_idkit_connector_blocked");
    expect(layout).toContain("EARLY_IN_APP_NAVIGATION_GUARD_SCRIPT");
    expect(layout).toContain("<head>");
    expect(layout).toContain("veripost-early-navigation-guard");
    expect(earlyNavigationGuardScript).toContain("installEarlyInAppNavigationGuard.toString()");
    expect(earlyNavigationGuardRuntime).toContain("recoverLegacyEntrypointLocation");
    expect(earlyNavigationGuardRuntime).toContain("early_legacy_auth_recovery");
    expect(earlyNavigationGuardRuntime).toContain("early_legacy_miniapp_recovery");
    expect(earlyNavigationGuardRuntime).toContain("installEarlyNativeCommandGuard");
    expect(earlyNavigationGuardRuntime).toContain("installEarlyNativeCommandGuardRefresh");
    expect(earlyNavigationGuardRuntime).toContain("__veripostAllowNativeWorldIdkitVerifyUntil");
    expect(earlyNavigationGuardRuntime).toContain("early_native_command");
    expect(earlyNavigationGuardRuntime).toContain("native-command=blocked");
    expect(earlyNavigationGuardRuntime).toContain("veripost:native-command-blocked");
    expect(instrumentationClient).toContain("installEarlyInAppNavigationGuard();");
    expect(legacyAuthState).toContain("next-auth.session-token");
    expect(legacyAuthState).toContain("authjs.session-token");
    expect(legacyAuthState).toContain("world_wallet_auth_nonce");
    expect(legacyAuthState).toContain("LEGACY_AUTH_COOKIE_PATHS");
    expect(legacyAuthState).toContain('"/proof-session"');
    expect(legacyAuthState).toContain('"/api/proof-session"');
    expect(legacyAuthState).toContain('"/api/nonce"');
    expect(legacyAuthState).toContain('"/api/complete-siwe"');
    expect(legacyAuthState).toContain('"/world-miniapp"');
    expect(legacyAuthState).toContain('"/world/wallet-auth"');
    expect(legacyAuthState).toContain('"/api/world/wallet-auth"');
    expect(legacyAuthState).toContain("walletconnect");
    expect(legacyAuthState).toContain("wagmi.store");
    expect(legacyAuthState).toContain("purgeLegacyBrowserRuntimeCaches");
    expect(legacyAuthState).toContain("purgeCacheStorage");
    expect(legacyAuthState).toContain("unregisterServiceWorkers");
    expect(legacyAuthState).toContain("cacheStorage.keys()");
    expect(legacyAuthState).toContain("serviceWorker.getRegistrations()");
    expect(serviceWorkerKillSwitch).toContain("self.skipWaiting()");
    expect(serviceWorkerKillSwitch).toContain("self.caches.keys()");
    expect(serviceWorkerKillSwitch).toContain("self.registration.unregister()");
    expect(serviceWorkerKillSwitch).toContain("self.clients.matchAll");
    expect(legacyServiceWorkerKillSwitch).toContain("self.registration.unregister()");
    expect(proxy).toContain("LEGACY_AUTH_COOKIE_NAMES");
    expect(proxy).toContain("LEGACY_AUTH_COOKIE_PATHS");
    expect(proxy).toContain("IN_APP_NAVIGATION_CSP");
    expect(proxy).toContain("https://x.com/intent/tweet");
    expect(proxy).toContain("https://twitter.com/intent/tweet");
    expect(proxy).not.toContain("https://x.com https://twitter.com");
    expect(proxy).toContain("world-miniapp-idkit-native-2026-06-01");
    expect(proxy).toContain("LEGACY_MINIAPP_SHELL_ENTRYPOINTS");
    expect(proxy).toContain("legacyDocumentRecoveryResponse");
    expect(proxy).toContain("X-VeriPost-Legacy-Recovery");
    expect(proxy).not.toContain("NextResponse.redirect");
    expect(proxy).toContain('url.search = ""');
    expect(proxy).toContain("/^\\/api\\/proof-session");
    expect(proxy).toContain("complete-siwe");
    expect(proxy).toContain("authenticate|authentication|authorize|authorization");
    expect(proxy).toContain("nonce");
    expect(proxy).toContain("rp-signature");
    expect(proxy).toContain("world-id");
    expect(proxy).toContain("world-miniapp");
    expect(proxy).toContain("/^\\/api\\/world-miniapp\\/(?:auth|authenticate|authentication|authorize|authorization");
    expect(proxy).toContain("/^\\/proof-session");
    expect(proxy).toContain("/^\\/(?:authenticate|authentication|authorize|authorization|authjs|callback|complete-auth");
    expect(proxy).toContain("log-in|log_in|login");
    expect(proxy).toContain("sign|sign-in|sign_in|signin");
    expect(proxy).toContain("world-auth");
    expect(proxy).toContain("/^\\/world\\/(?:auth|authenticate|authentication|authorize|authorization");
    expect(proxy).toContain('response.headers.append("Set-Cookie"');
    expect(proxy).toContain('"Max-Age=0"');
    expect(proxy).toContain("serializeLegacyCookieExpiration");
    expect(proxy).toContain('cookieName.startsWith("__Host-") ? ["/"]');
    expect(proxy).toContain("isSecureCookieName(cookieName)");
    expect(proxy).not.toContain("/^\\/proof(?:\\/|$)");
    expect(inAppNavigationGuard).toContain("/^\\/api\\/proof-session");
    expect(inAppNavigationGuard).toContain("complete-siwe");
    expect(inAppNavigationGuard).toContain("authenticate|authentication|authorize|authorization");
    expect(inAppNavigationGuard).toContain("nonce");
    expect(inAppNavigationGuard).toContain("rp-signature");
    expect(inAppNavigationGuard).toContain("world-id");
    expect(inAppNavigationGuard).toContain("world-miniapp");
    expect(inAppNavigationGuard).toContain("isLegacyMiniAppShellPath");
    expect(inAppNavigationGuard).toContain("/^\\/api\\/world-miniapp\\/(?:auth|authenticate|authentication|authorize|authorization");
    expect(inAppNavigationGuard).toContain("/^\\/proof-session");
    expect(inAppNavigationGuard).toContain("/^\\/(?:authenticate|authentication|authorize|authorization|authjs|callback|complete-auth");
    expect(inAppNavigationGuard).toContain("log-in|log_in|login");
    expect(inAppNavigationGuard).toContain("sign|sign-in|sign_in|signin");
    expect(inAppNavigationGuard).toContain("world-auth");
    expect(inAppNavigationGuard).toContain("^/world/(?:auth|authenticate|authentication|authorize|authorization");
    expect(inAppNavigationGuard).toContain('"navigation_api"');
    expect(inAppNavigationGuard).toContain('navigation.addEventListener("navigate"');
    expect(inAppNavigationGuard).toContain("event.destination?.url");
    expect(inAppNavigationGuard).not.toContain("/^\\/proof(?:\\/|$)");
    expect(earlyNavigationGuardRuntime).toContain("__veripostEarlyNavigationGuardInstalled");
    expect(earlyNavigationGuardRuntime).toContain("__veripostEarlyBlockedNavigations");
    expect(earlyNavigationGuardRuntime).toContain("__veripostAllowPostProofNavigation");
    expect(earlyNavigationGuardRuntime).toContain("__veripostEarlyRuntimeInitialReported");
    expect(earlyNavigationGuardRuntime).toContain("reportEarlyRuntimeInitial");
    expect(earlyNavigationGuardRuntime).toContain("world_runtime_initial");
    expect(earlyNavigationGuardRuntime).toContain("reportEarlyBlockedNavigation");
    expect(earlyNavigationGuardRuntime).toContain("/api/runtime-diagnostics");
    expect(earlyNavigationGuardRuntime).toContain("before React hydration");
    expect(earlyNavigationGuardRuntime).toContain("sendBeacon");
    expect(earlyNavigationGuardRuntime).toContain("walletAddress: \"missing\"");
    expect(earlyNavigationGuardRuntime).toContain("getEarlyNativeCommandName");
    expect(earlyNavigationGuardRuntime).toContain("early_navigation_api");
    expect(earlyNavigationGuardRuntime).toContain("early_window_open");
    expect(earlyNavigationGuardRuntime).toContain("/^\\/proof-session");
    expect(earlyNavigationGuardRuntime).toContain("complete-siwe");
    expect(earlyNavigationGuardRuntime).toContain("authenticate|authentication|authorize|authorization");
    expect(earlyNavigationGuardRuntime).toContain("log-in|log_in|login");
    expect(earlyNavigationGuardRuntime).toContain("sign|sign-in|sign_in|signin");
    expect(earlyNavigationGuardRuntime).toContain("world-auth");
    expect(earlyNavigationGuardRuntime).toContain("nonce");
    expect(earlyNavigationGuardRuntime).toContain("rp-signature");
    expect(earlyNavigationGuardRuntime).toContain("world-id");
    expect(earlyNavigationGuardRuntime).toContain("world-miniapp");
    expect(earlyNavigationGuardRuntime).not.toContain("MiniKit.walletAuth");
  });
});
