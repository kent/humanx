import { MiniKit as OfficialMiniKit } from "@worldcoin/minikit-js";

import { WORLD_MINIAPP_AUTH_FLOW_VERSION } from "@/lib/world-miniapp-auth";

export const WORLD_APP_CONTEXT_TIMEOUT_MS = 30_000;
export const WORLD_APP_CONTEXT_POLL_MS = 50;
export const WORLD_APP_CONTEXT_REFRESH_MS = 250;
export const WORLD_APP_FLOW_VERSION = WORLD_MINIAPP_AUTH_FLOW_VERSION;
const WORLD_APP_MINIKIT_INIT_VERSION = 1;
const WORLD_APP_MINIKIT_INIT_MINOR_VERSION = 96;
const WORLD_APP_STATE_INIT_RETRY_MS = 1_000;
const WORLD_APP_STATE_INIT_MAX_ATTEMPTS = 5;
const BLOCKED_MINIKIT_METHOD_MARKER = Symbol.for("veripost.minikit-command-blocked");
const GUARDED_NATIVE_POST_MESSAGE_MARKER = Symbol.for("veripost.native-post-message-guarded");
const VERIPOST_NATIVE_COMMAND_BLOCKED_EVENT = "veripost:native-command-blocked";
function worldAppOrigin(...codes: number[]): string {
  return globalThis.String.fromCharCode(...codes);
}

function miniKitMethodName(...codes: number[]): string {
  return globalThis.String.fromCharCode(...codes);
}

const WORLD_APP_PASSIVE_WORLD_ORIGIN = worldAppOrigin(104, 116, 116, 112, 115, 58, 47, 47, 119, 111, 114, 108, 100, 46, 111, 114, 103);
const WORLD_APP_PASSIVE_WORLDCOIN_ORIGIN = worldAppOrigin(104, 116, 116, 112, 115, 58, 47, 47, 119, 111, 114, 108, 100, 99, 111, 105, 110, 46, 111, 114, 103);
const REDIRECT_CAPABLE_MINIKIT_METHOD_NAMES = [
  miniKitMethodName(119, 97, 108, 108, 101, 116, 65, 117, 116, 104),
  miniKitMethodName(115, 105, 103, 110, 77, 101, 115, 115, 97, 103, 101),
  miniKitMethodName(115, 105, 103, 110, 84, 121, 112, 101, 100, 68, 97, 116, 97),
  miniKitMethodName(118, 101, 114, 105, 102, 121),
  miniKitMethodName(111, 112, 101, 110, 85, 114, 108),
  miniKitMethodName(111, 112, 101, 110, 85, 82, 76),
] as const;
const WORLD_APP_PASSIVE_MESSAGE_ORIGINS = new Set([
  WORLD_APP_PASSIVE_WORLD_ORIGIN,
  WORLD_APP_PASSIVE_WORLDCOIN_ORIGIN,
]);
const PASSIVE_ACCOUNT_CONTEXT_KEYS = [
  "World",
  "WorldApp",
  "WorldID",
  "Worldcoin",
  "worldApp",
  "world_app",
  "world",
  "worldID",
  "worldId",
  "world_id",
  "worldcoin",
  "MiniKit",
  "miniKit",
  "accountContext",
  "context",
  "data",
  "detail",
  "identity",
  "message",
  "miniApp",
  "mini_app",
  "payload",
  "profile",
  "result",
  "session",
  "user",
  "account",
  "wallet",
] as const;
const WORLD_APP_IOS_MESSAGE_HANDLER_KEYS = [
  "minikit",
  "miniKit",
  "MiniKit",
  "mini-kit",
  "mini_kit",
  "worldApp",
  "WorldApp",
  "worldapp",
  "world-app",
  "world_app",
] as const;
const WORLD_APP_ANDROID_POST_MESSAGE_KEYS = [
  "Android",
  "android",
  "MiniKitAndroid",
  "miniKitAndroid",
  "WorldAppAndroid",
  "worldAppAndroid",
  "ReactNativeWebView",
  "reactNativeWebView",
] as const;
const WORLD_APP_PASSIVE_CONTEXT_EVENT_NAMES = [
  "WorldApp",
  "worldapp",
  "world-app",
  "WorldID",
  "worldID",
  "worldid",
  "world-id",
  "Worldcoin",
  "worldcoin",
  "MiniKit",
  "minikit",
  "miniapp-account",
  "miniapp-context",
  "miniapp-user",
] as const;
const PRIMARY_WORLD_APP_GLOBAL_KEYS = ["WorldApp", "worldApp", "world_app"] as const;
const SECONDARY_WORLD_APP_GLOBAL_KEYS = [
  "World",
  "world",
  "WorldID",
  "worldID",
  "worldId",
  "world_id",
  "Worldcoin",
  "WorldCoin",
  "worldcoin",
] as const;
const WORLD_APP_PAYLOAD_SHAPE_KEYS = [
  "accountContext",
  "accounts",
  "address",
  "addresses",
  "device_os",
  "deviceOS",
  "ethereum_address",
  "ethereumAddress",
  "evm_address",
  "evmAddress",
  "supported_commands",
  "supportedCommands",
  "selectedAddress",
  "verification_status",
  "verificationStatus",
  "wallet_address",
  "walletAddress",
  "wallets",
  "world_app_version",
  "worldAppVersion",
] as const;

type WorldAppAccountLike = {
  address?: string;
  account_address?: string;
  accountAddress?: string;
  accountContext?: WorldAppAccountLike;
  accounts?: Array<WorldAppAccountLike | string>;
  addresses?: Array<WorldAppAccountLike | string>;
  context?: WorldAppAccountLike;
  data?: WorldAppAccountLike;
  device_os?: string;
  deviceOS?: string;
  detail?: WorldAppAccountLike;
  ethereum_address?: string;
  ethereumAddress?: string;
  evm_address?: string;
  evmAddress?: string;
  identity?: WorldAppAccountLike;
  message?: WorldAppAccountLike;
  mini_app?: WorldAppAccountLike;
  miniApp?: WorldAppAccountLike;
  payload?: WorldAppAccountLike;
  profile?: WorldAppAccountLike;
  primary_address?: string;
  primaryAddress?: string;
  result?: WorldAppAccountLike;
  selectedAddress?: string;
  session?: WorldAppAccountLike;
  state?: WorldAppAccountLike;
  wallet_address?: string;
  walletAddress?: string;
  wallets?: Array<WorldAppAccountLike | string>;
  world_app_version?: number | string;
  worldAppVersion?: number | string;
  user?: WorldAppAccountLike;
  account?: WorldAppAccountLike;
  wallet?: WorldAppAccountLike | string;
  verification_status?: {
    is_orb_verified?: boolean | string;
    is_document_verified?: boolean | string;
    is_secure_document_verified?: boolean | string;
  };
  verificationStatus?: {
    isOrbVerified?: boolean | string;
    isDocumentVerified?: boolean | string;
    isSecureDocumentVerified?: boolean | string;
  };
};

type WorldAppSupportedCommand = {
  name?: string;
  supported_versions?: Array<number | string>;
  supportedVersions?: Array<number | string>;
};

type WorldAppWalletProviderLike = WorldAppAccountLike & {
  _accounts?: Array<WorldAppAccountLike | string>;
  _selectedAddress?: string;
  _state?: WorldAppAccountLike;
  provider?: WorldAppWalletProviderLike;
  providers?: WorldAppWalletProviderLike[];
  selectedProvider?: WorldAppWalletProviderLike;
};

type WorldAppNativePostMessageTarget = {
  postMessage?: (payload: unknown) => void;
};

type WorldAppNativeTransport = {
  transport: WorldAppInitDiagnostics["transport"];
  target: WorldAppNativePostMessageTarget;
};

export type WorldAppWindow = Window & {
  CustomEvent?: typeof CustomEvent;
  MessageEvent?: typeof MessageEvent;
  WorldApp?: WorldAppAccountLike & {
    world_app_version?: number | string;
    worldAppVersion?: number | string;
    device_os?: string;
    deviceOS?: string;
    user?: WorldAppAccountLike;
    account?: WorldAppAccountLike;
    wallet?: WorldAppAccountLike | string;
    location?: string | {
      open_origin?: string;
      openOrigin?: string;
    } | null;
    supported_commands?: WorldAppSupportedCommand[];
    supportedCommands?: WorldAppSupportedCommand[];
  };
  worldApp?: WorldAppWindow["WorldApp"];
  world_app?: WorldAppWindow["WorldApp"];
  World?: WorldAppWindow["WorldApp"];
  world?: WorldAppWindow["WorldApp"];
  WorldID?: WorldAppWindow["WorldApp"];
  worldID?: WorldAppWindow["WorldApp"];
  worldId?: WorldAppWindow["WorldApp"];
  world_id?: WorldAppWindow["WorldApp"];
  Worldcoin?: WorldAppWindow["WorldApp"];
  WorldCoin?: WorldAppWindow["WorldApp"];
  worldcoin?: WorldAppWindow["WorldApp"];
  __veripostAllowNativeWorldIdkitVerifyUntil?: number;
  webkit?: {
    messageHandlers?: Record<string, { postMessage?: (payload: unknown) => void } | undefined>;
  };
  Android?: {
    postMessage?: (payload: string) => void;
  };
  android?: {
    postMessage?: (payload: string) => void;
  };
  ReactNativeWebView?: {
    postMessage?: (payload: string) => void;
  };
  MiniKit?: {
    appId?: string;
    address?: string;
    account?: WorldAppAccountLike;
    accountContext?: WorldAppAccountLike;
    accounts?: Array<WorldAppAccountLike | string>;
    addresses?: Array<WorldAppAccountLike | string>;
    context?: WorldAppAccountLike;
    data?: WorldAppAccountLike;
    detail?: WorldAppAccountLike;
    user?: {
      address?: string;
      accountContext?: WorldAppAccountLike;
      accounts?: Array<WorldAppAccountLike | string>;
      addresses?: Array<WorldAppAccountLike | string>;
      context?: WorldAppAccountLike;
      data?: WorldAppAccountLike;
      detail?: WorldAppAccountLike;
      wallet_address?: string;
      walletAddress?: string;
      account?: WorldAppAccountLike;
      identity?: WorldAppAccountLike;
      message?: WorldAppAccountLike;
      mini_app?: WorldAppAccountLike;
      miniApp?: WorldAppAccountLike;
      payload?: WorldAppAccountLike;
      profile?: WorldAppAccountLike;
      result?: WorldAppAccountLike;
      session?: WorldAppAccountLike;
      state?: WorldAppAccountLike;
      wallet?: WorldAppAccountLike;
      wallets?: Array<WorldAppAccountLike | string>;
      verificationStatus?: {
        isOrbVerified?: boolean | string;
        isDocumentVerified?: boolean | string;
        isSecureDocumentVerified?: boolean | string;
      };
    };
    identity?: WorldAppAccountLike;
    message?: WorldAppAccountLike;
    mini_app?: WorldAppAccountLike;
    miniApp?: WorldAppAccountLike;
    payload?: WorldAppAccountLike;
    profile?: WorldAppAccountLike;
    result?: WorldAppAccountLike;
    session?: WorldAppAccountLike;
    state?: WorldAppAccountLike;
    wallet?: WorldAppAccountLike;
    wallet_address?: string;
    walletAddress?: string;
    wallets?: Array<WorldAppAccountLike | string>;
    verificationStatus?: {
      isOrbVerified?: boolean | string;
      isDocumentVerified?: boolean | string;
      isSecureDocumentVerified?: boolean | string;
    };
    deviceProperties?: {
      worldAppVersion?: number | string;
      deviceOS?: string;
    };
    worldAppVersion?: number | string;
    deviceOS?: string;
    location?: "chat" | "home" | "app-store" | "deep-link" | "wallet-tab" | null;
    trigger?: (event: string, payload: unknown) => void;
    subscribe?: (event: string, handler: (payload: unknown) => void, ...args: unknown[]) => unknown;
    unsubscribe?: (event: string, handler?: (payload: unknown) => void, ...args: unknown[]) => unknown;
  };
  miniKit?: WorldAppWindow["MiniKit"];
  ethereum?: WorldAppWalletProviderLike;
  __worldapp_eip1193_address__?: string;
  __worldapp_eip1193_provider__?: WorldAppWalletProviderLike;
};

type WorldAppMiniKitState = {
  address?: string;
  account?: WorldAppAccountLike;
  accountContext?: WorldAppAccountLike;
  accounts?: Array<WorldAppAccountLike | string>;
  addresses?: Array<WorldAppAccountLike | string>;
  context?: WorldAppAccountLike;
  data?: WorldAppAccountLike;
  detail?: WorldAppAccountLike;
  user?: {
    address?: string;
    accountContext?: WorldAppAccountLike;
    accounts?: Array<WorldAppAccountLike | string>;
    addresses?: Array<WorldAppAccountLike | string>;
    context?: WorldAppAccountLike;
    data?: WorldAppAccountLike;
    detail?: WorldAppAccountLike;
    wallet_address?: string;
    walletAddress?: string;
    account?: WorldAppAccountLike;
    identity?: WorldAppAccountLike;
    message?: WorldAppAccountLike;
    mini_app?: WorldAppAccountLike;
    miniApp?: WorldAppAccountLike;
    payload?: WorldAppAccountLike;
    profile?: WorldAppAccountLike;
    result?: WorldAppAccountLike;
    session?: WorldAppAccountLike;
    state?: WorldAppAccountLike;
    wallet?: WorldAppAccountLike;
    wallets?: Array<WorldAppAccountLike | string>;
    verificationStatus?: {
      isOrbVerified?: boolean | string;
      isDocumentVerified?: boolean | string;
      isSecureDocumentVerified?: boolean | string;
    };
  };
  identity?: WorldAppAccountLike;
  message?: WorldAppAccountLike;
  mini_app?: WorldAppAccountLike;
  miniApp?: WorldAppAccountLike;
  payload?: WorldAppAccountLike;
  profile?: WorldAppAccountLike;
  result?: WorldAppAccountLike;
  session?: WorldAppAccountLike;
  state?: WorldAppMiniKitState | WorldAppAccountLike;
  wallet?: WorldAppAccountLike;
  wallet_address?: string;
  walletAddress?: string;
  wallets?: Array<WorldAppAccountLike | string>;
  verificationStatus?: {
    isOrbVerified?: boolean | string;
    isDocumentVerified?: boolean | string;
    isSecureDocumentVerified?: boolean | string;
  };
  deviceProperties?: {
    worldAppVersion?: number | string;
    deviceOS?: string;
  };
  worldAppVersion?: number | string;
  deviceOS?: string;
  location?: string | null;
  trigger?: unknown;
  subscribe?: unknown;
  unsubscribe?: unknown;
};

type WorldAppLaunchLocation = "chat" | "deep-link" | "home" | "app-store" | "wallet-tab" | null;

type WorldAppInitDiagnostics = {
  attempted: boolean;
  success: boolean | null;
  attempts: number;
  transport: "android" | "ios" | "missing";
  stateContainer: "created" | "existing" | "skipped" | "missing";
  errorCode: string | null;
  errorMessage: string | null;
};

export type WorldAppAccountPayload = {
  wallet_address: string;
  world_app_version?: number;
  device_os?: string;
  verification_status?: {
    is_orb_verified?: boolean;
    is_document_verified?: boolean;
    is_secure_document_verified?: boolean;
  };
};

export type WorldRuntimeDiagnostics = {
  flowVersion: string;
  worldAppRuntime: boolean;
  nativeTransport: boolean;
  worldAppUserAgent: boolean;
  walletAddress: "present" | "missing";
  accountSource: "world_app" | "minikit" | "wallet_provider" | "missing";
  accountSourceDetail:
    | "world_app_flat"
    | "world_app_user"
    | "world_app_account"
    | "world_app_wallet"
    | "world_app_user_account"
    | "world_app_user_wallet"
    | "world_app_message"
    | "minikit"
    | "wallet_provider"
    | "missing";
  orbVerified: boolean | null;
  worldAppVersion: number | null;
  deviceOS: string | null;
  launchLocation: string | null;
  openOrigin: string | null;
  miniKitBridge: {
    trigger: boolean;
    subscribe: boolean;
    unsubscribe: boolean;
  };
  worldAppInit: WorldAppInitDiagnostics;
  worldAppKeys: string[];
  worldAppShapeKeys: string[];
  miniKitUserKeys: string[];
};

type WorldAppRuntimeOptions = {
  getWindow?: () => WorldAppWindow | undefined;
  getMiniKitState?: () => WorldAppMiniKitState | undefined;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

type WaitForWorldAppAccountOptions = {
  timeoutMs?: number;
};

export function createWorldAppRuntime(options: WorldAppRuntimeOptions = {}) {
  let passiveWorldAppMessage: WorldAppWindow["WorldApp"] | undefined;
  let passiveWorldAppMessageBasePayload: WorldAppWindow["WorldApp"] | undefined;
  let passiveWorldAppMessageListenerInstalled = false;
  let worldAppStateInitAttempted = false;
  let worldAppStateInitAppId: string | null = null;
  let worldAppStateInitLastAttemptAt = 0;
  const worldAppInit = createInitialWorldAppInitDiagnostics();

  const getRuntimeWindow = () => {
    if (options.getWindow) return options.getWindow();
    if (typeof window === "undefined") return undefined;
    return window as WorldAppWindow;
  };
  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => globalThis.setTimeout(resolve, ms)));

  const getMiniKitState = () => {
    const nativeWindow = getRuntimeWindow();
    return options.getMiniKitState?.() ??
      nativeWindow?.MiniKit ??
      nativeWindow?.miniKit;
  };

  function createInitialWorldAppInitDiagnostics(): WorldAppInitDiagnostics {
    return {
      attempted: false,
      success: null,
      attempts: 0,
      transport: "missing",
      stateContainer: "missing",
      errorCode: null,
      errorMessage: null,
    };
  }

  function getWorldAppInitDiagnostics(): WorldAppInitDiagnostics {
    return { ...worldAppInit };
  }

  function getWorldAppOpenOrigin(): string | null {
    const location = getCurrentWorldAppPayload(getRuntimeWindow())?.location;
    if (!location) return null;
    if (typeof location === "string") return location;
    return location.open_origin ?? location.openOrigin ?? null;
  }

  function getWorldAppLaunchLocation(): WorldAppLaunchLocation {
    const openOrigin = getWorldAppOpenOrigin()?.toLowerCase();
    if (!openOrigin) return null;

    if (["app-store", "carousel", "explore", "app_details", "mini-app-listing"].includes(openOrigin)) return "app-store";
    if (["deep-link", "deeplink", "share"].includes(openOrigin)) return "deep-link";
    if (["home", "homepage", "launcher"].includes(openOrigin)) return "home";
    if (["wallet-tab", "wallet_tab", "wallet"].includes(openOrigin)) return "wallet-tab";
    if (["chat", "world_chat"].includes(openOrigin)) return "chat";
    return null;
  }

  function hasWorldAppRuntime(): boolean {
    return Boolean(getCurrentWorldAppPayload(getRuntimeWindow()));
  }

  function isInWorldApp(): boolean {
    return (
      hasWorldAppRuntime() ||
      hasNativeWorldAppTransport() ||
      hasWorldAppUserAgent() ||
      Boolean(getWorldAppAccountSnapshot())
    );
  }

  function hasWorldAppAccount(): boolean {
    return Boolean(getWorldAppAccountSnapshot());
  }

  function hasNativeWorldAppTransport(): boolean {
    return Boolean(getNativeWorldAppTransport(getRuntimeWindow()));
  }

  function hasWorldAppUserAgent(): boolean {
    const userAgent = getRuntimeWindow()?.navigator?.userAgent ?? "";
    return /world ?app|worldcoin/i.test(userAgent);
  }

  function hasLikelyWorldAppNativeTransport(nativeWindow: WorldAppWindow | undefined): boolean {
    if (!nativeWindow) return false;

    const iosHandlers = nativeWindow.webkit?.messageHandlers;
    for (const key of WORLD_APP_IOS_MESSAGE_HANDLER_KEYS) {
      if (typeof iosHandlers?.[key]?.postMessage === "function") return true;
    }

    const nativeRecord = nativeWindow as unknown as Record<string, WorldAppNativePostMessageTarget | undefined>;
    for (const key of ["MiniKitAndroid", "miniKitAndroid", "WorldAppAndroid", "worldAppAndroid"] as const) {
      if (typeof nativeRecord[key]?.postMessage === "function") return true;
    }

    return false;
  }

  function getWorldRuntimeDiagnostics(): WorldRuntimeDiagnostics {
    const nativeWindow = getRuntimeWindow();
    if (!nativeWindow) {
      return {
        flowVersion: WORLD_APP_FLOW_VERSION,
        worldAppRuntime: false,
        nativeTransport: false,
        worldAppUserAgent: false,
        walletAddress: "missing",
        accountSource: "missing",
        accountSourceDetail: "missing",
        orbVerified: null,
        worldAppVersion: null,
        deviceOS: null,
        launchLocation: null,
        openOrigin: null,
        miniKitBridge: {
          trigger: false,
          subscribe: false,
          unsubscribe: false,
        },
        worldAppInit: getWorldAppInitDiagnostics(),
        worldAppKeys: [],
        worldAppShapeKeys: [],
        miniKitUserKeys: [],
      };
    }

    const accountSnapshot = getWorldAppAccountSnapshot();
    const miniKitState = getMiniKitState();

    return {
      flowVersion: WORLD_APP_FLOW_VERSION,
      worldAppRuntime: hasWorldAppRuntime(),
      nativeTransport: hasNativeWorldAppTransport(),
      worldAppUserAgent: hasWorldAppUserAgent(),
      walletAddress: accountSnapshot?.wallet_address ? "present" : "missing",
      accountSource: getWorldAppAccountSource(),
      accountSourceDetail: getWorldAppAccountSourceDetail(),
      orbVerified: getWorldAccountOrbVerified(),
      worldAppVersion: accountSnapshot?.world_app_version ?? null,
      deviceOS: accountSnapshot?.device_os ?? null,
      launchLocation: getMiniKitLocation(miniKitState) ?? getWorldAppLaunchLocation(),
      openOrigin: getWorldAppOpenOrigin(),
      miniKitBridge: {
        trigger: typeof miniKitState?.trigger === "function",
        subscribe: typeof miniKitState?.subscribe === "function",
        unsubscribe: typeof miniKitState?.unsubscribe === "function",
      },
      worldAppInit: {
        ...getWorldAppInitDiagnostics(),
      },
      worldAppKeys: getPublicObjectKeys(getCurrentWorldAppPayload(nativeWindow)),
      worldAppShapeKeys: getWorldAppShapeKeys(nativeWindow),
      miniKitUserKeys: getPublicObjectKeys(miniKitState?.user),
    };
  }

  function initializeWorldAppRuntime(appId?: string): boolean {
    installPassiveWorldAppContextListeners();
    installWorldAppNativeCommandGuard(getRuntimeWindow());
    blockRedirectCapableMiniKitCommands(getMiniKitState());
    maybeRequestWorldAppAccountState(appId);
    return Boolean(getWorldAppAccountSnapshot());
  }

  function maybeRequestWorldAppAccountState(appId?: string): boolean {
    const nativeWindow = getRuntimeWindow();
    if (!nativeWindow) return false;
    if (typeof window === "undefined" || nativeWindow !== (window as WorldAppWindow)) return false;
    if (getWorldAppAccountSnapshot()) return false;

    const normalizedAppId = appId?.trim() || undefined;
    const nativeTransport = getNativeWorldAppTransport(nativeWindow);
    const nativeWorldAppBridge = hasLikelyWorldAppNativeTransport(nativeWindow);
    if (!nativeWindow.WorldApp && !hasWorldAppUserAgent() && !nativeWorldAppBridge) return false;
    if (!normalizedAppId && !nativeWindow.WorldApp) return false;
    const attemptAt = now();
    const initAttemptKey = normalizedAppId ?? "__without_app_id__";
    const sameAppId = worldAppStateInitAppId === initAttemptKey;
    if (worldAppStateInitAttempted && sameAppId) {
      const retryDue = attemptAt - worldAppStateInitLastAttemptAt >= WORLD_APP_STATE_INIT_RETRY_MS;
      const attemptsExhausted = worldAppInit.attempts >= WORLD_APP_STATE_INIT_MAX_ATTEMPTS;
      if (!retryDue || attemptsExhausted) return worldAppInit.success === true;
    }

    worldAppStateInitAttempted = true;
    worldAppStateInitAppId = initAttemptKey;
    worldAppStateInitLastAttemptAt = attemptAt;
    const hadMiniKit = Boolean(nativeWindow.MiniKit);
    worldAppInit.attempted = true;
    worldAppInit.attempts += 1;
    worldAppInit.transport = nativeTransport?.transport ?? "missing";
    worldAppInit.stateContainer = hadMiniKit ? "existing" : "missing";

    const officialMiniKitInstalled = maybeInstallOfficialMiniKit(nativeWindow, normalizedAppId, hadMiniKit);
    blockRedirectCapableMiniKitCommands(getMiniKitState());
    if (officialMiniKitInstalled && getWorldAppAccountSnapshot()) {
      return true;
    }
    if (
      officialMiniKitInstalled &&
      nativeTransport &&
      didOfficialMiniKitInitUseNativeTransport(nativeWindow, nativeTransport)
    ) {
      return false;
    }

    if (!normalizedAppId) return false;

    if (!nativeTransport) {
      worldAppInit.success = false;
      worldAppInit.errorCode = "missing_transport";
      worldAppInit.errorMessage = "World App native transport is missing";
      return false;
    }

    try {
      sendWorldAppStateInit(nativeTransport);
      worldAppInit.success = true;
      worldAppInit.stateContainer = hadMiniKit
        ? "existing"
        : nativeWindow.MiniKit
          ? "created"
          : "skipped";
      worldAppInit.errorCode = null;
      worldAppInit.errorMessage = null;
      return true;
    } catch (error) {
      worldAppInit.success = false;
      worldAppInit.errorCode = "unknown";
      worldAppInit.errorMessage = error instanceof Error ? error.message.slice(0, 160) : "World App init failed";
      return false;
    }
  }

  function maybeInstallOfficialMiniKit(
    nativeWindow: WorldAppWindow,
    appId: string | undefined,
    hadMiniKit: boolean,
  ): boolean {
    if (!nativeWindow.WorldApp) return false;
    if (typeof window === "undefined" || nativeWindow !== (window as WorldAppWindow)) return false;

    const existingMiniKit = nativeWindow.MiniKit as ({ install?: unknown } & WorldAppMiniKitState) | undefined;
    if (
      existingMiniKit &&
      existingMiniKit !== OfficialMiniKit &&
      typeof existingMiniKit.install !== "function"
    ) {
      return false;
    }

    try {
      const result = OfficialMiniKit.install(appId);
      const installedMiniKit = nativeWindow.MiniKit;
      blockRedirectCapableMiniKitCommands(installedMiniKit);
      worldAppInit.stateContainer = hadMiniKit ? "existing" : installedMiniKit ? "created" : "missing";
      worldAppInit.success = result.success || Boolean(installedMiniKit);
      worldAppInit.errorCode = result.success ? null : result.errorCode;
      worldAppInit.errorMessage = result.success ? null : result.errorMessage.slice(0, 160);
      return Boolean(installedMiniKit);
    } catch (error) {
      worldAppInit.success = false;
      worldAppInit.errorCode = "official_minikit_install_failed";
      worldAppInit.errorMessage = error instanceof Error ? error.message.slice(0, 160) : "MiniKit install failed";
      return false;
    }
  }

  function blockRedirectCapableMiniKitCommands(miniKit: WorldAppMiniKitState | undefined): void {
    const miniKitRecord = toMutableRecord(miniKit);
    if (!miniKitRecord) return;

    blockMiniKitCommandRecord(miniKitRecord);
    blockMiniKitCommandRecord(toMutableRecord(safeGetRecordValue(miniKitRecord, "commands")));
    blockMiniKitCommandRecord(toMutableRecord(safeGetRecordValue(miniKitRecord, "commandsAsync")));
  }

  function blockMiniKitCommandRecord(record: Record<string, unknown> | undefined): void {
    if (!record) return;

    for (const methodName of REDIRECT_CAPABLE_MINIKIT_METHOD_NAMES) {
      const method = safeGetRecordValue(record, methodName);
      if (typeof method !== "function") continue;
      if ((method as unknown as Record<symbol, unknown>)[BLOCKED_MINIKIT_METHOD_MARKER]) continue;

      const blockedMethod = createBlockedMiniKitCommandMethod(methodName);
      try {
        Object.defineProperty(record, methodName, {
          configurable: true,
          value: blockedMethod,
          writable: true,
        });
      } catch {
        try {
          record[methodName] = blockedMethod;
        } catch {
          // Host-injected MiniKit stubs can be read-only; navigation guards still cover URL exits.
        }
      }
    }
  }

  function createBlockedMiniKitCommandMethod(methodName: string): (...args: unknown[]) => Promise<never> {
    const blockedMethod = () => {
      reportBlockedMiniKitCommand(methodName);
      return Promise.reject(
        new Error("This MiniKit command is disabled because VeriPost uses the logged-in World App account context."),
      );
    };
    Object.defineProperty(blockedMethod, BLOCKED_MINIKIT_METHOD_MARKER, {
      value: true,
    });
    return blockedMethod;
  }

  function reportBlockedMiniKitCommand(methodName: string): void {
    const nativeWindow = typeof window !== "undefined"
      ? window as WorldAppWindow
      : getRuntimeWindow();
    if (!nativeWindow || typeof nativeWindow.dispatchEvent !== "function") return;
    if (typeof nativeWindow.CustomEvent !== "function") return;

    try {
      nativeWindow.dispatchEvent(new nativeWindow.CustomEvent("veripost:minikit-command-blocked", {
        detail: {
          command: methodName.replace(/[^a-z0-9_-]/gi, "").slice(0, 40),
        },
      }));
    } catch {
      // Diagnostics are best-effort; blocking the command is the important behavior.
    }
  }

  function installWorldAppNativeCommandGuard(nativeWindow: WorldAppWindow | undefined): void {
    if (!nativeWindow) return;
    if (!nativeWindow.WorldApp && !hasWorldAppUserAgent() && !hasLikelyWorldAppNativeTransport(nativeWindow)) return;

    for (const target of getAllNativeWorldAppPostMessageTargets(nativeWindow)) {
      guardNativePostMessageTarget(target);
    }
  }

  function getAllNativeWorldAppPostMessageTargets(nativeWindow: WorldAppWindow): WorldAppNativePostMessageTarget[] {
    const targets: WorldAppNativePostMessageTarget[] = [];
    const seenTargets = new Set<WorldAppNativePostMessageTarget>();
    const addTarget = (target: WorldAppNativePostMessageTarget | undefined) => {
      if (!target || typeof target.postMessage !== "function" || seenTargets.has(target)) return;
      seenTargets.add(target);
      targets.push(target);
    };

    const iosHandlers = nativeWindow.webkit?.messageHandlers;
    for (const key of WORLD_APP_IOS_MESSAGE_HANDLER_KEYS) {
      addTarget(iosHandlers?.[key]);
    }

    const nativeRecord = nativeWindow as unknown as Record<string, WorldAppNativePostMessageTarget | undefined>;
    for (const key of WORLD_APP_ANDROID_POST_MESSAGE_KEYS) {
      addTarget(nativeRecord[key]);
    }

    return targets;
  }

  function guardNativePostMessageTarget(target: WorldAppNativePostMessageTarget): void {
    const originalPostMessage = target.postMessage;
    if (typeof originalPostMessage !== "function") return;
    if ((originalPostMessage as unknown as Record<symbol, unknown>)[GUARDED_NATIVE_POST_MESSAGE_MARKER]) return;

    const guardedPostMessage = (payload: unknown) => {
      const commandName = getNativeCommandName(payload);
      if (commandName && !isAllowedWorldAppNativeCommand(commandName)) {
        reportBlockedWorldAppNativeCommand(commandName);
        return;
      }

      return originalPostMessage.call(target, payload);
    };
    Object.defineProperty(guardedPostMessage, GUARDED_NATIVE_POST_MESSAGE_MARKER, {
      value: true,
    });

    try {
      Object.defineProperty(target, "postMessage", {
        configurable: true,
        value: guardedPostMessage,
        writable: true,
      });
    } catch {
      try {
        target.postMessage = guardedPostMessage;
      } catch {
        // Some native bridge objects are immutable; command-method and navigation guards still apply.
      }
    }
  }

  function getNativeCommandName(payload: unknown): string | undefined {
    const parsedPayload = parsePassiveWorldAppPayload(payload);
    const payloadRecord = toRecord(parsedPayload);
    const command = payloadRecord?.command;
    return normalizeDiagnosticText(command);
  }

  function isAllowedWorldAppNativeCommand(commandName: string): boolean {
    const normalizedCommand = commandName.toLowerCase();
    if (normalizedCommand === "init") return true;
    if (normalizedCommand !== "verify") return false;

    const nativeWindow = typeof window !== "undefined"
      ? window as WorldAppWindow
      : getRuntimeWindow();
    const allowanceUntil = nativeWindow?.__veripostAllowNativeWorldIdkitVerifyUntil;
    return typeof allowanceUntil === "number" && allowanceUntil > Date.now();
  }

  function reportBlockedWorldAppNativeCommand(commandName: string): void {
    const nativeWindow = typeof window !== "undefined"
      ? window as WorldAppWindow
      : getRuntimeWindow();
    if (!nativeWindow || typeof nativeWindow.dispatchEvent !== "function") return;
    if (typeof nativeWindow.CustomEvent !== "function") return;

    try {
      nativeWindow.dispatchEvent(new nativeWindow.CustomEvent(VERIPOST_NATIVE_COMMAND_BLOCKED_EVENT, {
        detail: {
          command: commandName.replace(/[^a-z0-9_-]/gi, "").slice(0, 40),
        },
      }));
    } catch {
      // Diagnostics are best-effort; blocking the command is the important behavior.
    }
  }

  function sendWorldAppStateInit(nativeTransport: WorldAppNativeTransport): void {
    const payload = {
      command: "init",
      payload: {
        version: WORLD_APP_MINIKIT_INIT_VERSION,
        minorVersion: WORLD_APP_MINIKIT_INIT_MINOR_VERSION,
      },
    };

    if (nativeTransport.transport === "android") {
      nativeTransport.target.postMessage?.(JSON.stringify(payload));
      return;
    }

    nativeTransport.target.postMessage?.(payload);
  }

  function didOfficialMiniKitInitUseNativeTransport(
    nativeWindow: WorldAppWindow,
    nativeTransport: WorldAppNativeTransport,
  ): boolean {
    if (nativeTransport.transport === "ios") {
      return nativeWindow.webkit?.messageHandlers?.minikit === nativeTransport.target;
    }

    return !nativeWindow.webkit && nativeWindow.Android === nativeTransport.target;
  }

  function getNativeWorldAppTransport(nativeWindow: WorldAppWindow | undefined): WorldAppNativeTransport | undefined {
    if (!nativeWindow) return undefined;

    const iosTarget = getIosNativePostMessageTarget(nativeWindow);
    if (!shouldPreferAndroidNativeBridge(nativeWindow) && iosTarget) {
      return {
        transport: "ios",
        target: iosTarget,
      };
    }

    const androidTarget = getAndroidNativePostMessageTarget(nativeWindow);
    if (androidTarget) {
      return {
        transport: "android",
        target: androidTarget,
      };
    }

    return undefined;
  }

  function getIosNativePostMessageTarget(nativeWindow: WorldAppWindow): WorldAppNativePostMessageTarget | undefined {
    const iosHandlers = nativeWindow.webkit?.messageHandlers;
    for (const key of WORLD_APP_IOS_MESSAGE_HANDLER_KEYS) {
      const target = iosHandlers?.[key];
      if (target && typeof target.postMessage === "function") return target;
    }

    return undefined;
  }

  function getAndroidNativePostMessageTarget(
    nativeWindow: WorldAppWindow,
  ): WorldAppNativePostMessageTarget | undefined {
    const nativeRecord = nativeWindow as unknown as Record<string, WorldAppNativePostMessageTarget | undefined>;
    for (const key of WORLD_APP_ANDROID_POST_MESSAGE_KEYS) {
      const target = nativeRecord[key];
      if (target && typeof target.postMessage === "function") return target;
    }

    return undefined;
  }

  function shouldPreferAndroidNativeBridge(nativeWindow: WorldAppWindow): boolean {
    if (!getAndroidNativePostMessageTarget(nativeWindow)) return false;

    const deviceOS = getWorldAppDeviceOS(getCurrentWorldAppPayload(nativeWindow)) ??
      getMiniKitDeviceOS(getMiniKitState()) ??
      normalizeDiagnosticText(nativeWindow.navigator?.userAgent);
    return /android/i.test(deviceOS ?? "");
  }

  function getWorldAccountOrbVerified(): boolean | null {
    const nativeWindow = getRuntimeWindow();
    if (!nativeWindow) return null;
    const miniKitVerificationStatus = getMiniKitVerificationStatus(getMiniKitState());

    return (
      getWorldAppVerificationStatus(nativeWindow)?.is_orb_verified ??
      normalizeBoolean(miniKitVerificationStatus?.isOrbVerified) ??
      null
    );
  }

  function refreshWorldAppContext(_appId: string): boolean {
    return initializeWorldAppRuntime(_appId);
  }

  function primeWorldAppRuntime(appId?: string): boolean {
    return initializeWorldAppRuntime(appId);
  }

  function isValidWalletAddress(value: string | undefined): value is `0x${string}` {
    return Boolean(value && /^0x[0-9a-fA-F]{40}$/.test(value));
  }

  function getWorldAppAccountSource(): WorldRuntimeDiagnostics["accountSource"] {
    const nativeWindow = getRuntimeWindow();
    if (!nativeWindow) return "missing";
    const miniKitState = getMiniKitState();
    const surfaceEvidence = hasWorldAppSurfaceEvidence();

    if (isValidWalletAddress(getWorldAppWalletAddress(nativeWindow))) return "world_app";
    if (surfaceEvidence && isValidWalletAddress(getMiniKitWalletAddress(miniKitState))) return "minikit";
    if (isValidWalletAddress(getWalletProviderWalletAddress(nativeWindow))) return "wallet_provider";
    return "missing";
  }

  function getWorldAppAccountSourceDetail(): WorldRuntimeDiagnostics["accountSourceDetail"] {
    const nativeWindow = getRuntimeWindow();
    if (!nativeWindow) return "missing";

    const worldAppCandidate = getWorldAppAccountCandidate(nativeWindow);
    if (worldAppCandidate) return worldAppCandidate.sourceDetail;
    if (isValidWalletAddress(getWorldAppWalletAddressFromWorldApp(passiveWorldAppMessage))) return "world_app_message";
    if (hasWorldAppSurfaceEvidence() && isValidWalletAddress(getMiniKitWalletAddress(getMiniKitState()))) return "minikit";
    if (isValidWalletAddress(getWalletProviderWalletAddress(nativeWindow))) return "wallet_provider";
    return "missing";
  }

  function getWorldAppAccountSnapshot(): WorldAppAccountPayload | null {
    const nativeWindow = getRuntimeWindow();
    if (!nativeWindow) return null;

    const worldApp = getCurrentWorldAppPayload(nativeWindow);
    const directWorldApp = getDirectWorldAppPayload(nativeWindow);
    const miniKit = getMiniKitState();
    const surfaceEvidence = hasWorldAppSurfaceEvidence();
    const worldAppWalletAddress = getWorldAppWalletAddressFromWorldApp(worldApp);
    const miniKitWalletAddress = surfaceEvidence ? getMiniKitWalletAddress(miniKit) : undefined;
    const walletProviderAddress = getWalletProviderWalletAddress(nativeWindow);
    const walletAddress = isValidWalletAddress(worldAppWalletAddress)
      ? worldAppWalletAddress
      : isValidWalletAddress(miniKitWalletAddress)
        ? miniKitWalletAddress
        : isValidWalletAddress(walletProviderAddress)
          ? walletProviderAddress
          : null;

    if (!walletAddress) return null;

    const miniKitVerificationStatus = getMiniKitVerificationStatus(miniKit);
    const verificationStatus = getWorldAppVerificationStatus(nativeWindow) ??
      getVerificationStatusFromWorldAppPayload(directWorldApp) ??
      (miniKitVerificationStatus
      ? normalizeVerificationStatus({
          is_orb_verified: miniKitVerificationStatus.isOrbVerified,
          is_document_verified: miniKitVerificationStatus.isDocumentVerified,
          is_secure_document_verified: miniKitVerificationStatus.isSecureDocumentVerified,
        })
      : undefined);

    return {
      wallet_address: walletAddress,
      world_app_version: getWorldAppVersion(worldApp) ??
        getWorldAppVersion(directWorldApp) ??
        getMiniKitVersion(miniKit),
      device_os: getWorldAppDeviceOS(worldApp) ??
        getWorldAppDeviceOS(directWorldApp) ??
        getMiniKitDeviceOS(miniKit),
      verification_status: verificationStatus,
    };
  }

  function getWorldAppAccountCandidate(nativeWindow: WorldAppWindow):
    | {
        sourceDetail: Extract<
          WorldRuntimeDiagnostics["accountSourceDetail"],
          | "world_app_flat"
          | "world_app_user"
          | "world_app_account"
          | "world_app_wallet"
          | "world_app_user_account"
          | "world_app_user_wallet"
        >;
        accountLike: WorldAppAccountLike;
      }
    | undefined {
    const worldApp = getDirectWorldAppPayload(nativeWindow);
    if (!worldApp) return undefined;

    return getWorldAppAccountCandidateFromWorldApp(worldApp);
  }

  function getWorldAppAccountCandidateFromWorldApp(worldApp: WorldAppWindow["WorldApp"]):
    | {
        sourceDetail: Extract<
          WorldRuntimeDiagnostics["accountSourceDetail"],
          | "world_app_flat"
          | "world_app_user"
          | "world_app_account"
          | "world_app_wallet"
          | "world_app_user_account"
          | "world_app_user_wallet"
        >;
        accountLike: WorldAppAccountLike;
      }
    | undefined {
    if (!worldApp) return undefined;

    for (const [sourceDetail, accountLike, nested] of [
      ["world_app_flat", worldApp, false],
      ["world_app_user", worldApp.user, false],
      ["world_app_account", worldApp.accountContext, true],
      ["world_app_account", worldApp.context, true],
      ["world_app_account", worldApp.data, true],
      ["world_app_account", worldApp.detail, true],
      ["world_app_account", worldApp.message, true],
      ["world_app_account", worldApp.payload, true],
      ["world_app_account", worldApp.result, true],
      ["world_app_account", worldApp.miniApp, true],
      ["world_app_account", worldApp.mini_app, true],
      ["world_app_account", worldApp.state, true],
      ["world_app_account", worldApp.profile, true],
      ["world_app_account", worldApp.session, true],
      ["world_app_account", worldApp.identity, true],
      ["world_app_account", worldApp.account, true],
      ["world_app_account", firstAccountLikeCandidate(worldApp.accounts), true],
      ["world_app_account", firstAccountLikeCandidate(worldApp.addresses), true],
      ["world_app_wallet", worldApp.wallet, true],
      ["world_app_wallet", firstAccountLikeCandidate(worldApp.wallets), true],
      ["world_app_user_account", worldApp.user?.accountContext, true],
      ["world_app_user_account", worldApp.user?.context, true],
      ["world_app_user_account", worldApp.user?.data, true],
      ["world_app_user_account", worldApp.user?.detail, true],
      ["world_app_user_account", worldApp.user?.message, true],
      ["world_app_user_account", worldApp.user?.payload, true],
      ["world_app_user_account", worldApp.user?.result, true],
      ["world_app_user_account", worldApp.user?.miniApp, true],
      ["world_app_user_account", worldApp.user?.mini_app, true],
      ["world_app_user_account", worldApp.user?.state, true],
      ["world_app_user_account", worldApp.user?.profile, true],
      ["world_app_user_account", worldApp.user?.session, true],
      ["world_app_user_account", worldApp.user?.identity, true],
      ["world_app_user_account", worldApp.user?.account, true],
      ["world_app_user_account", firstAccountLikeCandidate(worldApp.user?.accounts), true],
      ["world_app_user_account", firstAccountLikeCandidate(worldApp.user?.addresses), true],
      ["world_app_user_wallet", worldApp.user?.wallet, true],
      ["world_app_user_wallet", firstAccountLikeCandidate(worldApp.user?.wallets), true],
    ] as const) {
      const normalizedAccountLike = nested
        ? getAccountLikeWithAddress(accountLike, 3)
        : getDirectAccountLikeWithAddress(accountLike);
      if (normalizedAccountLike) {
        return { sourceDetail, accountLike: normalizedAccountLike };
      }
    }

    return undefined;
  }

  function getWorldAppWalletAddress(nativeWindow: WorldAppWindow | undefined): string | undefined {
    if (!nativeWindow) return undefined;

    return getWorldAppWalletAddressFromWorldApp(getCurrentWorldAppPayload(nativeWindow));
  }

  function getWorldAppWalletAddressFromWorldApp(worldApp: WorldAppWindow["WorldApp"]): string | undefined {
    const accountLike = worldApp
      ? getWorldAppAccountCandidateFromWorldApp(worldApp)?.accountLike ?? worldApp
      : undefined;
    return getAccountLikeWalletAddress(accountLike);
  }

  function getAccountLikeWalletAddress(accountLike: WorldAppAccountLike | undefined): string | undefined {
    return normalizeWalletAddressCandidate(
      accountLike?.wallet_address ??
        accountLike?.walletAddress ??
        accountLike?.address ??
        accountLike?.account_address ??
        accountLike?.accountAddress ??
        accountLike?.primary_address ??
        accountLike?.primaryAddress ??
        accountLike?.selectedAddress ??
        (accountLike as WorldAppWalletProviderLike | undefined)?._selectedAddress ??
        accountLike?.ethereum_address ??
        accountLike?.ethereumAddress ??
        accountLike?.evm_address ??
        accountLike?.evmAddress ??
        (typeof accountLike?.wallet === "string" ? accountLike.wallet : undefined),
    );
  }

  function getMiniKitWalletAddress(miniKit: WorldAppMiniKitState | undefined): string | undefined {
    const userCandidate = getMiniKitUserAccountLike(miniKit);
    const rootCandidate = getMiniKitRootAccountLike(miniKit);
    return getAccountLikeWalletAddress(userCandidate) ?? getAccountLikeWalletAddress(rootCandidate);
  }

  function getWalletProviderWalletAddress(nativeWindow: WorldAppWindow | undefined): string | undefined {
    if (!nativeWindow || !hasWorldAppSurfaceEvidence()) return undefined;
    return getAccountLikeWalletAddress(getWalletProviderAccountLike(nativeWindow.ethereum)) ??
      getAccountLikeWalletAddress(getWalletProviderAccountLike(nativeWindow.__worldapp_eip1193_provider__)) ??
      normalizeWalletAddressCandidate(nativeWindow.__worldapp_eip1193_address__);
  }

  function hasWorldAppSurfaceEvidence(): boolean {
    return hasWorldAppRuntime() || hasNativeWorldAppTransport() || hasWorldAppUserAgent();
  }

  function getWalletProviderAccountLike(
    provider: WorldAppWalletProviderLike | undefined,
    nestedDepth = 3,
  ): WorldAppAccountLike | undefined {
    if (!provider) return undefined;
    const nestedProviderAccounts = nestedDepth > 0
      ? [
          getWalletProviderAccountLike(provider.provider, nestedDepth - 1),
          getWalletProviderAccountLike(provider.selectedProvider, nestedDepth - 1),
          ...(provider.providers ?? []).map((nestedProvider) =>
            getWalletProviderAccountLike(nestedProvider, nestedDepth - 1)
          ),
        ]
      : [];

    return firstAccountLikeWithAddress([
      provider,
      firstAccountLikeCandidate(provider.accounts),
      firstAccountLikeCandidate(provider.addresses),
      firstAccountLikeCandidate(provider._accounts),
      provider._state,
      firstAccountLikeCandidate(provider._state?.accounts),
      firstAccountLikeCandidate(provider._state?.addresses),
      ...nestedProviderAccounts,
    ], nestedDepth);
  }

  function getMiniKitUserAccountLike(miniKit: WorldAppMiniKitState | undefined): WorldAppAccountLike | undefined {
    const user = miniKit?.user;
    if (!user) return undefined;

    return firstAccountLikeWithAddress([
      user,
      user.accountContext,
      user.context,
      user.data,
      user.detail,
      user.message,
      user.payload,
      user.result,
      user.miniApp,
      user.mini_app,
      user.state,
      user.profile,
      user.session,
      user.identity,
      user.account,
      firstAccountLikeCandidate(user.accounts),
      firstAccountLikeCandidate(user.addresses),
      user.wallet,
      firstAccountLikeCandidate(user.wallets),
    ], 3);
  }

  function getMiniKitRootAccountLike(miniKit: WorldAppMiniKitState | undefined): WorldAppAccountLike | undefined {
    if (!miniKit) return undefined;

    return firstAccountLikeWithAddress([
      miniKit,
      miniKit.accountContext,
      miniKit.context,
      miniKit.data,
      miniKit.detail,
      miniKit.message,
      miniKit.payload,
      miniKit.result,
      miniKit.miniApp,
      miniKit.mini_app,
      miniKit.state as WorldAppAccountLike | undefined,
      miniKit.profile,
      miniKit.session,
      miniKit.identity,
      miniKit.account,
      firstAccountLikeCandidate(miniKit.accounts),
      firstAccountLikeCandidate(miniKit.addresses),
      miniKit.wallet,
      firstAccountLikeCandidate(miniKit.wallets),
    ], 3);
  }

  function normalizeAccountLikeCandidate(value: WorldAppAccountLike | string | undefined): WorldAppAccountLike | undefined {
    if (typeof value === "string") return { wallet_address: value };
    return value;
  }

  function getDirectAccountLikeWithAddress(
    value: WorldAppAccountLike | string | undefined,
  ): WorldAppAccountLike | undefined {
    const candidate = normalizeAccountLikeCandidate(value);
    if (!candidate) return undefined;

    return isValidWalletAddress(getAccountLikeWalletAddress(candidate)) ? candidate : undefined;
  }

  function getAccountLikeWithAddress(
    value: WorldAppAccountLike | string | undefined,
    nestedDepth: number,
  ): WorldAppAccountLike | undefined {
    const candidate = getDirectAccountLikeWithAddress(value);
    if (candidate || nestedDepth <= 0) return candidate;

    const accountLike = normalizeAccountLikeCandidate(value);
    if (!accountLike) return undefined;

    return firstAccountLikeWithAddress([
      accountLike.accountContext,
      accountLike.context,
      accountLike.data,
      accountLike.detail,
      accountLike.message,
      accountLike.payload,
      accountLike.result,
      accountLike.miniApp,
      accountLike.mini_app,
      accountLike.state,
      accountLike.user,
      accountLike.profile,
      accountLike.session,
      accountLike.identity,
      accountLike.account,
      firstAccountLikeWithAddress(accountLike.accounts, nestedDepth - 1),
      firstAccountLikeWithAddress(accountLike.addresses, nestedDepth - 1),
      accountLike.wallet,
      firstAccountLikeWithAddress(accountLike.wallets, nestedDepth - 1),
    ], nestedDepth - 1);
  }

  function firstAccountLikeCandidate(
    values: Array<WorldAppAccountLike | string> | undefined,
  ): WorldAppAccountLike | undefined {
    return firstAccountLikeWithAddress(values, 1);
  }

  function firstAccountLikeWithAddress(
    values: Array<WorldAppAccountLike | string | undefined> | undefined,
    nestedDepth = 0,
  ): WorldAppAccountLike | undefined {
    if (!values) return undefined;

    for (const value of values) {
      const candidate = getAccountLikeWithAddress(value, nestedDepth);
      if (candidate) return candidate;
    }

    return undefined;
  }

  function getWorldAppVersion(worldApp: WorldAppWindow["WorldApp"]): number | undefined {
    const accountLike = getWorldAppAccountLikeFromWorldApp(worldApp);
    return normalizeVersion(
      worldApp?.world_app_version ??
        worldApp?.worldAppVersion ??
        accountLike?.world_app_version ??
        accountLike?.worldAppVersion,
    );
  }

  function getWorldAppDeviceOS(worldApp: WorldAppWindow["WorldApp"]): string | undefined {
    const accountLike = getWorldAppAccountLikeFromWorldApp(worldApp);
    return normalizeDiagnosticText(
      worldApp?.device_os ??
        worldApp?.deviceOS ??
        accountLike?.device_os ??
        accountLike?.deviceOS,
    );
  }

  function getMiniKitStateWrapper(miniKit: WorldAppMiniKitState | undefined): WorldAppMiniKitState | undefined {
    const state = miniKit?.state;
    return state && typeof state === "object" && !Array.isArray(state)
      ? state as WorldAppMiniKitState
      : undefined;
  }

  function getMiniKitVerificationStatus(miniKit: WorldAppMiniKitState | undefined): NonNullable<WorldAppMiniKitState["user"]>["verificationStatus"] | undefined {
    const state = getMiniKitStateWrapper(miniKit);
    const accountLike = getMiniKitUserAccountLike(miniKit) ??
      getMiniKitRootAccountLike(miniKit) ??
      getMiniKitUserAccountLike(state) ??
      getMiniKitRootAccountLike(state);
    return miniKit?.user?.verificationStatus ??
      miniKit?.verificationStatus ??
      state?.user?.verificationStatus ??
      state?.verificationStatus ??
      accountLike?.verificationStatus;
  }

  function getMiniKitVersion(miniKit: WorldAppMiniKitState | undefined): number | undefined {
    const state = getMiniKitStateWrapper(miniKit);
    return normalizeVersion(miniKit?.deviceProperties?.worldAppVersion) ??
      normalizeVersion(miniKit?.worldAppVersion) ??
      normalizeVersion(state?.deviceProperties?.worldAppVersion) ??
      normalizeVersion(state?.worldAppVersion);
  }

  function getMiniKitDeviceOS(miniKit: WorldAppMiniKitState | undefined): string | undefined {
    const state = getMiniKitStateWrapper(miniKit);
    return normalizeDiagnosticText(miniKit?.deviceProperties?.deviceOS) ??
      normalizeDiagnosticText(miniKit?.deviceOS) ??
      normalizeDiagnosticText(state?.deviceProperties?.deviceOS) ??
      normalizeDiagnosticText(state?.deviceOS);
  }

  function getMiniKitLocation(miniKit: WorldAppMiniKitState | undefined): string | null | undefined {
    return miniKit?.location ?? getMiniKitStateWrapper(miniKit)?.location;
  }

  function getWorldAppVerificationStatus(
    nativeWindow: WorldAppWindow | undefined,
  ): WorldAppAccountPayload["verification_status"] | undefined {
    if (!nativeWindow) return undefined;

    return getVerificationStatusFromWorldAppPayload(getCurrentWorldAppPayload(nativeWindow));
  }

  function getVerificationStatusFromWorldAppPayload(
    worldApp: WorldAppWindow["WorldApp"],
  ): WorldAppAccountPayload["verification_status"] | undefined {
    if (!worldApp) return undefined;

    const accountLike = getWorldAppAccountLikeFromWorldApp(worldApp);
    if (accountLike?.verification_status) {
      return normalizeVerificationStatus(accountLike.verification_status);
    }

    const verificationStatus = accountLike?.verificationStatus;
    if (!verificationStatus) return undefined;

    return normalizeVerificationStatus({
      is_orb_verified: verificationStatus.isOrbVerified,
      is_document_verified: verificationStatus.isDocumentVerified,
      is_secure_document_verified: verificationStatus.isSecureDocumentVerified,
    });
  }

  function getWorldAppAccountLikeFromWorldApp(worldApp: WorldAppWindow["WorldApp"]): WorldAppAccountLike | undefined {
    if (!worldApp) return undefined;

    const candidate = getWorldAppAccountCandidateFromWorldApp(worldApp);
    if (candidate) return candidate.accountLike;

    return worldApp;
  }

  function normalizeWalletAddressCandidate(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  function normalizeVersion(value: unknown): number | undefined {
    if (typeof value === "number") {
      return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
    }

    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return undefined;

    const parsed = Number(trimmed);
    return Number.isSafeInteger(parsed) ? parsed : undefined;
  }

  function normalizeDiagnosticText(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 80) : undefined;
  }

  function normalizeVerificationStatus(
    verificationStatus: NonNullable<WorldAppAccountLike["verification_status"]>,
  ): WorldAppAccountPayload["verification_status"] {
    return {
      is_orb_verified: normalizeBoolean(verificationStatus.is_orb_verified),
      is_document_verified: normalizeBoolean(verificationStatus.is_document_verified),
      is_secure_document_verified: normalizeBoolean(verificationStatus.is_secure_document_verified),
    };
  }

  function normalizeBoolean(value: unknown): boolean | undefined {
    if (typeof value === "boolean") return value;
    if (typeof value !== "string") return undefined;

    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    return undefined;
  }

  function getPublicObjectKeys(value: Record<string, unknown> | undefined): string[] {
    if (!value) return [];

    return Object.keys(value)
      .filter((key) => key.length <= 80)
      .sort()
      .slice(0, 64);
  }

  function getWorldAppShapeKeys(nativeWindow: WorldAppWindow): string[] {
    const worldApp = getCurrentWorldAppPayload(nativeWindow);
    if (!worldApp) return [];

    const labelPrefix = getWorldAppPayloadLabel(nativeWindow);
    return [
      [labelPrefix, worldApp],
      [`${labelPrefix}.user`, worldApp.user],
      [`${labelPrefix}.accountContext`, worldApp.accountContext],
      [`${labelPrefix}.context`, worldApp.context],
      [`${labelPrefix}.data`, worldApp.data],
      [`${labelPrefix}.detail`, worldApp.detail],
      [`${labelPrefix}.message`, worldApp.message],
      [`${labelPrefix}.payload`, worldApp.payload],
      [`${labelPrefix}.result`, worldApp.result],
      [`${labelPrefix}.miniApp`, worldApp.miniApp],
      [`${labelPrefix}.mini_app`, worldApp.mini_app],
      [`${labelPrefix}.state`, worldApp.state],
      [`${labelPrefix}.profile`, worldApp.profile],
      [`${labelPrefix}.session`, worldApp.session],
      [`${labelPrefix}.identity`, worldApp.identity],
      [`${labelPrefix}.account`, worldApp.account],
      [`${labelPrefix}.accounts.0`, normalizeAccountLikeCandidate(worldApp.accounts?.[0])],
      [`${labelPrefix}.addresses.0`, normalizeAccountLikeCandidate(worldApp.addresses?.[0])],
      [`${labelPrefix}.wallet`, typeof worldApp.wallet === "object" ? worldApp.wallet : undefined],
      [`${labelPrefix}.wallets.0`, normalizeAccountLikeCandidate(worldApp.wallets?.[0])],
      [`${labelPrefix}.user.accountContext`, worldApp.user?.accountContext],
      [`${labelPrefix}.user.context`, worldApp.user?.context],
      [`${labelPrefix}.user.data`, worldApp.user?.data],
      [`${labelPrefix}.user.detail`, worldApp.user?.detail],
      [`${labelPrefix}.user.message`, worldApp.user?.message],
      [`${labelPrefix}.user.payload`, worldApp.user?.payload],
      [`${labelPrefix}.user.result`, worldApp.user?.result],
      [`${labelPrefix}.user.miniApp`, worldApp.user?.miniApp],
      [`${labelPrefix}.user.mini_app`, worldApp.user?.mini_app],
      [`${labelPrefix}.user.state`, worldApp.user?.state],
      [`${labelPrefix}.user.profile`, worldApp.user?.profile],
      [`${labelPrefix}.user.session`, worldApp.user?.session],
      [`${labelPrefix}.user.identity`, worldApp.user?.identity],
      [`${labelPrefix}.user.account`, worldApp.user?.account],
      [`${labelPrefix}.user.accounts.0`, normalizeAccountLikeCandidate(worldApp.user?.accounts?.[0])],
      [`${labelPrefix}.user.addresses.0`, normalizeAccountLikeCandidate(worldApp.user?.addresses?.[0])],
      [`${labelPrefix}.user.wallet`, typeof worldApp.user?.wallet === "object" ? worldApp.user.wallet : undefined],
      [`${labelPrefix}.user.wallets.0`, normalizeAccountLikeCandidate(worldApp.user?.wallets?.[0])],
    ].flatMap(([label, value]) =>
      getPublicObjectKeys(value as Record<string, unknown> | undefined)
        .map((key) => `${label}.${key}`)
        .filter((keyPath) => keyPath.length <= 120),
    ).slice(0, 64);
  }

  function getCurrentWorldAppPayload(nativeWindow: WorldAppWindow | undefined): WorldAppWindow["WorldApp"] {
    const directPayload = getDirectWorldAppPayload(nativeWindow);
    if (getWorldAppWalletAddressFromWorldApp(directPayload)) return directPayload;
    if (
      passiveWorldAppMessage &&
      (
        passiveWorldAppMessageBasePayload === directPayload ||
        (!directPayload && passiveWorldAppMessageBasePayload === undefined) ||
        (
          passiveWorldAppMessageBasePayload === undefined &&
          Boolean(directPayload)
        )
      )
    ) {
      return passiveWorldAppMessage;
    }
    return directPayload;
  }

  function getDirectWorldAppPayload(nativeWindow: WorldAppWindow | undefined): WorldAppWindow["WorldApp"] {
    if (!nativeWindow) return undefined;

    const globalRecord = nativeWindow as unknown as Record<string, WorldAppWindow["WorldApp"] | undefined>;
    for (const key of PRIMARY_WORLD_APP_GLOBAL_KEYS) {
      const payload = globalRecord[key];
      if (payload) return payload;
    }

    for (const key of SECONDARY_WORLD_APP_GLOBAL_KEYS) {
      const payload = globalRecord[key];
      if (isSecondaryWorldAppPayload(payload)) return payload;
    }

    return undefined;
  }

  function getWorldAppPayloadLabel(nativeWindow: WorldAppWindow): string {
    const globalRecord = nativeWindow as unknown as Record<string, WorldAppWindow["WorldApp"] | undefined>;
    for (const key of PRIMARY_WORLD_APP_GLOBAL_KEYS) {
      if (globalRecord[key]) return key;
    }
    for (const key of SECONDARY_WORLD_APP_GLOBAL_KEYS) {
      if (isSecondaryWorldAppPayload(globalRecord[key])) return key;
    }
    return "WorldApp.message";
  }

  function isSecondaryWorldAppPayload(value: unknown): value is WorldAppWindow["WorldApp"] {
    const record = toRecord(value);
    if (!record) return false;
    if (isWorldAppPayloadCandidate(record)) return true;
    return WORLD_APP_PAYLOAD_SHAPE_KEYS.some((key) => key in record);
  }

  function installPassiveWorldAppContextListeners(): void {
    const nativeWindow = getRuntimeWindow();
    const nativeDocument = nativeWindow?.document;
    if (
      passiveWorldAppMessageListenerInstalled ||
      !nativeWindow ||
      (
        typeof nativeWindow.addEventListener !== "function" &&
        typeof nativeDocument?.addEventListener !== "function"
      )
    ) {
      return;
    }

    passiveWorldAppMessageListenerInstalled = true;
    const handlePassiveMessage = (event: MessageEvent) => {
      if (!isAcceptedPassiveMessageOrigin(nativeWindow, event.origin)) return;
      capturePassiveWorldAppContext(event.data);
    };
    const handlePassiveContextEvent = (event: Event) => {
      capturePassiveWorldAppContext((event as CustomEvent).detail);
    };

    nativeWindow.addEventListener?.("message", handlePassiveMessage, true);
    nativeDocument?.addEventListener?.("message", handlePassiveMessage as EventListener, true);
    for (const eventName of WORLD_APP_PASSIVE_CONTEXT_EVENT_NAMES) {
      nativeWindow.addEventListener?.(eventName, handlePassiveContextEvent, true);
      nativeDocument?.addEventListener?.(eventName, handlePassiveContextEvent, true);
    }
  }

  function isAcceptedPassiveMessageOrigin(nativeWindow: WorldAppWindow, origin: string): boolean {
    if (!origin) return true;
    if (origin === "null") return hasNativeWorldAppTransport() || hasWorldAppUserAgent();
    if (
      WORLD_APP_PASSIVE_MESSAGE_ORIGINS.has(origin) &&
      (hasNativeWorldAppTransport() || hasWorldAppUserAgent())
    ) {
      return true;
    }
    if (
      /^(worldapp|worldcoin):\/\//i.test(origin) &&
      (hasNativeWorldAppTransport() || hasWorldAppUserAgent())
    ) {
      return true;
    }

    try {
      return origin === nativeWindow.location.origin;
    } catch {
      return false;
    }
  }

  function capturePassiveWorldAppContext(value: unknown): boolean {
    const worldAppPayload = findPassiveWorldAppPayload(value);
    if (!worldAppPayload) return false;

    passiveWorldAppMessage = worldAppPayload;
    passiveWorldAppMessageBasePayload = getDirectWorldAppPayload(getRuntimeWindow());
    return true;
  }

  function findPassiveWorldAppPayload(value: unknown, seen = new WeakSet<object>()): WorldAppWindow["WorldApp"] | undefined {
    const parsed = parsePassiveWorldAppPayload(value);
    if (parsed && typeof parsed === "object") {
      if (seen.has(parsed)) return undefined;
      seen.add(parsed);
    }

    if (Array.isArray(parsed)) {
      for (const item of parsed.slice(0, 16)) {
        const nestedPayload = findPassiveWorldAppPayload(item, seen);
        if (nestedPayload) return nestedPayload;
      }

      return undefined;
    }

    const record = toRecord(parsed);
    if (!record) return undefined;

    if (isWorldAppPayloadCandidate(record)) return record as WorldAppWindow["WorldApp"];

    for (const key of PASSIVE_ACCOUNT_CONTEXT_KEYS) {
      const nestedPayload = findPassiveWorldAppPayload(record[key], seen);
      if (nestedPayload) return nestedPayload;
    }

    return undefined;
  }

  function parsePassiveWorldAppPayload(value: unknown): unknown {
    if (typeof value !== "string") return value;
    if (value.length > 16_384) return value;

    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }

  function toRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    return value as Record<string, unknown>;
  }

  function toMutableRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value || (typeof value !== "object" && typeof value !== "function")) return undefined;
    return value as Record<string, unknown>;
  }

  function safeGetRecordValue(record: Record<string, unknown>, key: string): unknown {
    try {
      return record[key];
    } catch {
      return undefined;
    }
  }

  function isWorldAppPayloadCandidate(value: Record<string, unknown>): boolean {
    return Boolean(getWorldAppWalletAddressFromWorldApp(value as WorldAppWindow["WorldApp"]));
  }

  async function waitForWorldAppAccountRuntime(
    _appId: string,
    waitOptions: WaitForWorldAppAccountOptions = {},
  ): Promise<WorldAppAccountPayload> {
    void _appId;
    const startedAt = now();
    const timeoutMs = waitOptions.timeoutMs ?? WORLD_APP_CONTEXT_TIMEOUT_MS;

    while (now() - startedAt < timeoutMs) {
      initializeWorldAppRuntime(_appId);
      const account = getWorldAppAccountSnapshot();

      if (account) {
        return account;
      }

      await sleep(WORLD_APP_CONTEXT_POLL_MS);
    }

    if (!isInWorldApp()) {
      throw new Error("Open VeriPost in World App so VeriPost can read the current account.");
    }

    throw new Error("World App did not expose your logged-in account. Reopen VeriPost from the mini app listing or update World App.");
  }

  return {
    getWorldAccountOrbVerified,
    getWorldAppAccountSnapshot,
    getWorldAppAccountSource,
    getWorldRuntimeDiagnostics,
    hasWorldAppAccount,
    hasWorldAppRuntime,
    hasNativeWorldAppTransport,
    hasWorldAppUserAgent,
    initializeWorldAppRuntime,
    isInWorldApp,
    primeWorldAppRuntime,
    refreshWorldAppContext,
    waitForWorldAppAccountRuntime,
  };
}
