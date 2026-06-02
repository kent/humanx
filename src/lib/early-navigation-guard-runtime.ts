type EarlyNavigationAttempt = {
  target: string;
  trigger: string;
};

type EarlyNavigationWindow = Window &
  typeof globalThis & {
    Android?: {
      postMessage?: (payload: string) => void;
    };
    android?: {
      postMessage?: (payload: string) => void;
    };
    MiniKit?: {
      subscribe?: unknown;
      trigger?: unknown;
      unsubscribe?: unknown;
    };
    MiniKitAndroid?: {
      postMessage?: (payload: string) => void;
    };
    miniKitAndroid?: {
      postMessage?: (payload: string) => void;
    };
    ReactNativeWebView?: {
      postMessage?: (payload: string) => void;
    };
    reactNativeWebView?: {
      postMessage?: (payload: string) => void;
    };
    WorldAppAndroid?: {
      postMessage?: (payload: string) => void;
    };
    worldAppAndroid?: {
      postMessage?: (payload: string) => void;
    };
    WorldApp?: unknown;
    __veripostAllowPostProofNavigation?: boolean;
    __veripostAllowNativeWorldIdkitVerifyUntil?: number;
    __veripostEarlyBlockedNavigations?: EarlyNavigationAttempt[];
    __veripostEarlyNavigationGuardCleanup?: () => void;
    __veripostEarlyNavigationGuardInstalled?: boolean;
    __veripostEarlyRuntimeInitialReported?: boolean;
    miniKit?: EarlyNavigationWindow["MiniKit"];
    webkit?: {
      messageHandlers?: Record<string, {
        postMessage?: (payload: unknown) => void;
      } | undefined>;
    };
    worldApp?: unknown;
    world_app?: unknown;
  };

type NavigationLike = EventTarget & {
  removeEventListener?: EventTarget["removeEventListener"];
};

type EarlyNativePostMessageTarget = {
  postMessage?: (payload: unknown) => unknown;
};

type NavigationEventLike = Event & {
  destination?: {
    url?: string;
  };
};

export function installEarlyInAppNavigationGuard(nativeWindow: EarlyNavigationWindow = window as EarlyNavigationWindow) {
  if (nativeWindow.__veripostEarlyNavigationGuardInstalled) return;
  nativeWindow.__veripostEarlyNavigationGuardInstalled = true;
  const cleanup: Array<() => void> = [];
  const legacyPatterns = [
    /^\/(?:mini-app|miniapp|world|world-app|world-miniapp)\/?$/,
    /^\/(?:api\/)?(?:auth-callback|auth_callback|connect-wallet|connect_wallet|log-in-with-x|log_in_with_x|login-with-x|login_with_x|oauth-callback|oauth_callback|sign-in-with-x|sign_in_with_x|signin-with-x|signin_with_x|twitter-auth|twitter_auth|twitter-login|twitter_login|twitter-oauth|twitter_oauth|wallet_auth|world-auth|world_auth|world-id-auth|world_id_auth|world-id-login|world_id_login|world-id-sign-in|world_id_sign_in|world-log-in|world_log_in|world-login|world_login|world-sign-in|world_sign_in|world-signin|world_signin|world-wallet-auth|world_wallet_auth|worldid-auth|worldid_auth|worldid-login|worldid_login|worldid-sign-in|worldid_sign_in|x-auth|x_auth|x-login|x_login|x-oauth|x_oauth)(?:\/|$)/,
    /^\/(?:api\/)?(?:world|world-miniapp)\/(?:auth-callback|auth_callback|connect-wallet|connect_wallet|log-in-with-x|log_in_with_x|login-with-x|login_with_x|oauth-callback|oauth_callback|sign-in-with-x|sign_in_with_x|signin-with-x|signin_with_x|twitter-auth|twitter_auth|twitter-login|twitter_login|twitter-oauth|twitter_oauth|wallet_auth|world-auth|world_auth|world-id-auth|world_id_auth|world-id-login|world_id_login|world-id-sign-in|world_id_sign_in|world-log-in|world_log_in|world-login|world_login|world-sign-in|world_sign_in|world-signin|world_signin|world-wallet-auth|world_wallet_auth|worldid-auth|worldid_auth|worldid-login|worldid_login|worldid-sign-in|worldid_sign_in|x-auth|x_auth|x-login|x_login|x-oauth|x_oauth)(?:\/|$)/,
    /^\/api\/auth(?:\/|$)/,
    /^\/api\/proof-session(?:\/|$)/,
    /^\/api\/(?:authenticate|authentication|authorize|authorization|authjs|callback|complete-auth|complete-siwe|complete-wallet-auth|connect|idkit|idkit-rp|log-in|log_in|login|minikit|mini-kit|next-auth|nonce|oauth|oauth2|rp|rp-signature|session|sign|sign-in|sign_in|signin|signature|siwe|twitter|twitter-auth|verify|wallet|wallet-auth|world-auth|world-id|world-wallet-auth|worldid|x-auth|x-oauth)(?:\/|$)/,
    /^\/api\/world-miniapp\/(?:auth|authenticate|authentication|authorize|authorization|callback|complete-auth|complete-siwe|complete-wallet-auth|connect|idkit|idkit-rp|log-in|log_in|login|minikit|mini-kit|nonce|rp|rp-signature|session|sign|sign-in|sign_in|signature|siwe|verify|wallet|wallet-auth|world-auth|world-id|worldid)(?:\/|$)/,
    /^\/api\/world\/(?:auth|authenticate|authentication|authorize|authorization|callback|complete-auth|complete-siwe|complete-wallet-auth|connect|idkit|idkit-rp|log-in|log_in|login|minikit|mini-kit|nonce|oauth|oauth2|rp|rp-signature|session|sign|sign-in|sign_in|signature|siwe|verify|wallet|wallet-auth|world-auth|world-id|worldid)(?:\/|$)/,
    /^\/auth(?:\/|$)/,
    /^\/proof-session(?:\/|$)/,
    /^\/(?:authenticate|authentication|authorize|authorization|authjs|callback|complete-auth|complete-siwe|complete-wallet-auth|connect|idkit|idkit-rp|log-in|log_in|login|minikit|mini-kit|next-auth|nonce|oauth|oauth2|rp|rp-signature|session|sign|sign-in|sign_in|signin|signature|siwe|twitter|twitter-auth|verify|wallet|wallet-auth|world-auth|world-id|world-wallet-auth|worldid|x-auth|x-oauth)(?:\/|$)/,
    /^\/world-miniapp\/(?:auth|authenticate|authentication|authorize|authorization|callback|complete-auth|complete-siwe|complete-wallet-auth|connect|idkit|idkit-rp|log-in|log_in|login|minikit|mini-kit|nonce|rp|rp-signature|session|sign|sign-in|sign_in|signature|siwe|verify|wallet|wallet-auth|world-auth|world-id|worldid)(?:\/|$)/,
    /^\/world\/(?:auth|authenticate|authentication|authorize|authorization|callback|complete-auth|complete-siwe|complete-wallet-auth|connect|idkit|idkit-rp|log-in|log_in|login|minikit|mini-kit|nonce|oauth|oauth2|rp|rp-signature|session|sign|sign-in|sign_in|signature|siwe|verify|wallet|wallet-auth|world-auth|world-id|worldid)(?:\/|$)/,
  ];
  function fromCharCodes(...codes: number[]) {
    return nativeWindow.String.fromCharCode(...codes);
  }

  const callbackQueryKey = fromCharCodes(99, 97, 108, 108, 98, 97, 99, 107);
  const callbackCamelQueryKey = fromCharCodes(99, 97, 108, 108, 98, 97, 99, 107, 85, 114, 108);
  const callbackSnakeQueryKey = fromCharCodes(99, 97, 108, 108, 98, 97, 99, 107, 95, 117, 114, 108);
  const redirectUriQueryKey = fromCharCodes(114, 101, 100, 105, 114, 101, 99, 116, 95, 117, 114, 105);
  const redirectUrlSnakeQueryKey = fromCharCodes(114, 101, 100, 105, 114, 101, 99, 116, 95, 117, 114, 108);
  const redirectToQueryKey = fromCharCodes(114, 101, 100, 105, 114, 101, 99, 116, 84, 111);
  const redirectToSnakeQueryKey = fromCharCodes(114, 101, 100, 105, 114, 101, 99, 116, 95, 116, 111);
  const returnUrlQueryKey = fromCharCodes(114, 101, 116, 117, 114, 110, 85, 114, 108);
  const returnUrlSnakeQueryKey = fromCharCodes(114, 101, 116, 117, 114, 110, 95, 117, 114, 108);
  const continueUrlQueryKey = fromCharCodes(99, 111, 110, 116, 105, 110, 117, 101, 85, 114, 108);
  const continueUrlSnakeQueryKey = fromCharCodes(99, 111, 110, 116, 105, 110, 117, 101, 95, 117, 114, 108);
  const destinationUrlQueryKey = fromCharCodes(100, 101, 115, 116, 105, 110, 97, 116, 105, 111, 110, 85, 114, 108);
  const worldAppProtocol = fromCharCodes(119, 111, 114, 108, 100, 97, 112, 112, 58);
  const worldCoinProtocol = fromCharCodes(119, 111, 114, 108, 100, 99, 111, 105, 110, 58);
  const worldHostname = fromCharCodes(119, 111, 114, 108, 100, 46, 111, 114, 103);
  const worldCoinHostname = fromCharCodes(119, 111, 114, 108, 100, 99, 111, 105, 110, 46, 111, 114, 103);
  const legacyExternalHandoffQueryKeys = [
    "path",
    "pathname",
    "next",
    "url",
    "to",
    "target",
    "destination",
    destinationUrlQueryKey,
    "goto",
    "state",
    "continue",
    continueUrlQueryKey,
    continueUrlSnakeQueryKey,
  ];
  const legacyAuthReturnQueryKeys = [
    callbackQueryKey,
    callbackCamelQueryKey,
    callbackSnakeQueryKey,
    "redirect",
    redirectUriQueryKey,
    "redirectUri",
    "redirectUrl",
    redirectUrlSnakeQueryKey,
    redirectToQueryKey,
    redirectToSnakeQueryKey,
    ["return", "to"].join("_"),
    "returnTo",
    returnUrlQueryKey,
    returnUrlSnakeQueryKey,
  ];
  const legacyRootQueryKeys = [
    ...legacyExternalHandoffQueryKeys,
    ...legacyAuthReturnQueryKeys,
  ];

  function toUrl(target: unknown) {
    try {
      return typeof target === "string" || target instanceof nativeWindow.URL
        ? new nativeWindow.URL(target, nativeWindow.location.href)
        : null;
    } catch {
      return null;
    }
  }

  function isAllowedPostProofNavigation(url: URL) {
    return Boolean(
      nativeWindow.__veripostAllowPostProofNavigation &&
        url.protocol === "https:" &&
        (url.hostname === "x.com" || url.hostname === "twitter.com") &&
        url.pathname === "/intent/tweet",
    );
  }

  function isLegacyPath(pathname: string) {
    return legacyPatterns.some((pattern) => pattern.test(pathname));
  }

  function isLegacyMiniAppShellPath(pathname: string) {
    return /^\/(?:mini-app|miniapp|world|world-app|world-miniapp)\/?$/.test(pathname);
  }

  function isLegacyRootQueryNavigation(url: URL) {
    return getLegacyRootQueryEntrypoint(url) !== null;
  }

  function getLegacyRootQueryEntrypoint(url: URL): "auth" | "miniapp" | null {
    if (url.pathname !== "/") return null;

    const currentUrl = new nativeWindow.URL(nativeWindow.location.href);
    for (const key of legacyRootQueryKeys) {
      const value = url.searchParams.get(key);
      if (!value) {
        if (url.searchParams.has(key) && isLegacyAuthReturnQueryKey(key)) return "auth";
        continue;
      }

      const parsedUrl = parseRootQueryUrl(value, currentUrl);
      if (!parsedUrl) {
        if (isLegacyAuthReturnQueryKey(key)) return "auth";
        continue;
      }

      if (parsedUrl.origin === currentUrl.origin) {
        if (isLegacyMiniAppShellPath(parsedUrl.pathname)) return "miniapp";
        if (isLegacyPath(parsedUrl.pathname)) return "auth";
      }

      if (isLegacyExternalAuthEntrypoint(parsedUrl)) return "auth";
      if (
        isLegacyExternalHandoffQueryKey(key) &&
        parsedUrl.origin !== currentUrl.origin &&
        !isAllowedRootQueryTarget(parsedUrl, currentUrl)
      ) {
        return "auth";
      }
      if (isLegacyAuthReturnQueryKey(key) && !isAllowedRootQueryTarget(parsedUrl, currentUrl)) return "auth";
    }

    for (const [key, value] of url.searchParams) {
      if (isLegacyRootQueryKey(key)) continue;
      if (isLegacyAuthTriggerQueryKey(key)) return "auth";
      if (!shouldInspectUnknownRootQueryValue(value)) continue;

      const parsedUrl = parseRootQueryUrl(value, currentUrl);
      if (!parsedUrl) continue;

      if (parsedUrl.origin === currentUrl.origin) {
        if (isLegacyMiniAppShellPath(parsedUrl.pathname)) return "miniapp";
        if (isLegacyPath(parsedUrl.pathname)) return "auth";
        continue;
      }

      if (isLegacyExternalAuthEntrypoint(parsedUrl)) return "auth";
      if (!isAllowedRootQueryTarget(parsedUrl, currentUrl)) return "auth";
    }

    return null;
  }

  function isLegacyHashNavigation(url: URL) {
    return getLegacyHashEntrypoint(url) !== null;
  }

  function getLegacyHashEntrypoint(url: URL): "auth" | "miniapp" | null {
    if (!url.hash) return null;

    const currentUrl = new nativeWindow.URL(nativeWindow.location.href);
    const hashValue = decodeHashValue(url.hash);
    if (!hashValue) return null;

    const hashUrl = parseRootQueryUrl(hashValue, currentUrl);
    if (hashUrl) {
      if (hashUrl.origin === currentUrl.origin) {
        if (isLegacyMiniAppShellPath(hashUrl.pathname)) return "miniapp";
        if (isLegacyPath(hashUrl.pathname)) return "auth";
        const rootQueryEntrypoint = getLegacyRootQueryEntrypoint(hashUrl);
        if (rootQueryEntrypoint) return rootQueryEntrypoint;
      }

      if (isLegacyExternalAuthEntrypoint(hashUrl)) return "auth";
    }

    const hashQuery = getHashQueryString(hashValue);
    if (!hashQuery) return null;

    const syntheticUrl = new nativeWindow.URL(currentUrl.href);
    syntheticUrl.pathname = "/";
    syntheticUrl.hash = "";
    syntheticUrl.search = hashQuery;
    return getLegacyRootQueryEntrypoint(syntheticUrl);
  }

  function getHashQueryString(hashValue: string) {
    if (isBareHashQueryString(hashValue)) return hashValue;
    const queryStartIndex = hashValue.indexOf("?");
    if (queryStartIndex >= 0) return hashValue.slice(queryStartIndex + 1);
    return "";
  }

  function isBareHashQueryString(value: string) {
    return /(?:^|&)[^/?#&=]{1,80}=/.test(value);
  }

  function decodeHashValue(hash: string) {
    const value = hash.startsWith("#") ? hash.slice(1) : hash;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  function parseRootQueryUrl(value: string, baseUrl: URL) {
    try {
      return new nativeWindow.URL(normalizeRootQueryUrlValue(value), baseUrl);
    } catch {
      return null;
    }
  }

  function isLegacyExternalAuthEntrypoint(url: URL) {
    if (url.protocol === worldAppProtocol || url.protocol === worldCoinProtocol) return true;
    if (url.protocol !== "https:") return false;

    const hostname = url.hostname.toLowerCase();
    if ((hostname === "x.com" || hostname === "twitter.com") && url.pathname !== "/intent/tweet") return true;
    if (hostname === "api.twitter.com") return true;
    if (
      (hostname === worldHostname || hostname === worldCoinHostname) &&
      (url.pathname.startsWith("/verify") || url.pathname.startsWith("/mini-app"))
    ) {
      return true;
    }
    return false;
  }

  function isLegacyAuthReturnQueryKey(key: string) {
    return legacyAuthReturnQueryKeys.some((returnKey) => key === returnKey);
  }

  function isLegacyExternalHandoffQueryKey(key: string) {
    return legacyExternalHandoffQueryKeys.some((handoffKey) => key === handoffKey);
  }

  function isLegacyRootQueryKey(key: string) {
    return legacyRootQueryKeys.some((rootKey) => key === rootKey);
  }

  function isLegacyAuthTriggerQueryKey(key: string) {
    const normalized = key.trim().replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[_\s]+/g, "-").toLowerCase();
    return /^(?:auth|auth-callback|authenticate|authentication|authorize|authorization|connect-wallet|log-in|login|log-in-with-x|login-with-x|sign|signin|sign-in|sign-in-with-x|signin-with-x|wallet|wallet-auth|world-auth|world-id-auth|world-id-login|world-id-sign-in|world-log-in|world-login|world-sign-in|world-signin|world-wallet-auth|miniapp-wallet-auth|minikit|mini-kit|idkit|verify|world-id|worldid|worldid-auth|worldid-login|worldid-sign-in|oauth|oauth2|oauth-callback|siwe|nonce|signature|rp|rp-signature|proof-session|next-auth|authjs|twitter-auth|twitter-login|twitter-oauth|x-auth|x-login|x-oauth)$/.test(normalized);
  }

  function shouldInspectUnknownRootQueryValue(value: string) {
    const trimmed = value.trim();
    return (
      trimmed.startsWith("/") ||
      /^[a-z][a-z\d+.-]*:/i.test(trimmed) ||
      isHostLikeRootQueryValue(trimmed) ||
      isLegacyRelativeAuthHandoffValue(trimmed)
    );
  }

  function normalizeRootQueryUrlValue(value: string) {
    const trimmed = value.trim();
    if (isHostLikeRootQueryValue(trimmed)) return `https://${trimmed}`;
    return trimmed;
  }

  function isHostLikeRootQueryValue(value: string) {
    return /^(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(value);
  }

  function isLegacyRelativeAuthHandoffValue(value: string) {
    const normalized = value.replace(/\\/g, "/").replace(/^[./]+/, "").toLowerCase();
    return /^(?:api\/)?(?:auth-callback|auth_callback|connect-wallet|connect_wallet|log-in-with-x|log_in_with_x|login-with-x|login_with_x|oauth-callback|oauth_callback|sign-in-with-x|sign_in_with_x|signin-with-x|signin_with_x|twitter-auth|twitter_auth|twitter-login|twitter_login|twitter-oauth|twitter_oauth|wallet_auth|world-auth|world_auth|world-id-auth|world_id_auth|world-id-login|world_id_login|world-id-sign-in|world_id_sign_in|world-log-in|world_log_in|world-login|world_login|world-sign-in|world_sign_in|world-signin|world_signin|world-wallet-auth|world_wallet_auth|worldid-auth|worldid_auth|worldid-login|worldid_login|worldid-sign-in|worldid_sign_in|x-auth|x_auth|x-login|x_login|x-oauth|x_oauth)(?:\/|$)/.test(normalized) ||
      /^(?:api\/)?(?:world|world-miniapp)\/(?:auth-callback|auth_callback|connect-wallet|connect_wallet|log-in-with-x|log_in_with_x|login-with-x|login_with_x|oauth-callback|oauth_callback|sign-in-with-x|sign_in_with_x|signin-with-x|signin_with_x|twitter-auth|twitter_auth|twitter-login|twitter_login|twitter-oauth|twitter_oauth|wallet_auth|world-auth|world_auth|world-id-auth|world_id_auth|world-id-login|world_id_login|world-id-sign-in|world_id_sign_in|world-log-in|world_log_in|world-login|world_login|world-sign-in|world_sign_in|world-signin|world_signin|world-wallet-auth|world_wallet_auth|worldid-auth|worldid_auth|worldid-login|worldid_login|worldid-sign-in|worldid_sign_in|x-auth|x_auth|x-login|x_login|x-oauth|x_oauth)(?:\/|$)/.test(normalized) ||
      /^(?:api\/)?(?:auth|authenticate|authentication|authorize|authorization|authjs|callback|complete-auth|complete-siwe|complete-wallet-auth|connect|idkit|idkit-rp|log-in|log_in|login|minikit|mini-kit|next-auth|nonce|oauth|oauth2|proof-session|rp|rp-signature|session|sign|sign-in|sign_in|signin|signature|siwe|twitter|twitter-auth|verify|wallet|wallet-auth|world-app|world-auth|world-id|world-miniapp|world-wallet-auth|worldid|x-auth|x-oauth)(?:\/|$)/.test(normalized) ||
      /^(?:api\/)?world\/(?:auth|authenticate|authentication|authorize|authorization|callback|complete-auth|complete-siwe|complete-wallet-auth|connect|idkit|idkit-rp|log-in|log_in|login|minikit|mini-kit|nonce|oauth|oauth2|rp|rp-signature|session|sign|sign-in|sign_in|signature|siwe|verify|wallet|wallet-auth|world-auth|world-id|worldid)(?:\/|$)/.test(normalized);
  }

  function isAllowedRootQueryTarget(targetUrl: URL, currentUrl: URL) {
    if (targetUrl.origin === currentUrl.origin) {
      return targetUrl.pathname === "/" || targetUrl.pathname.startsWith("/proof/");
    }

    return (
      targetUrl.protocol === "https:" &&
      (targetUrl.hostname === "x.com" || targetUrl.hostname === "twitter.com") &&
      targetUrl.pathname === "/intent/tweet"
    );
  }

  function sanitize(url: URL) {
    if (url.protocol === "mailto:") return "mailto:";
    const path = url.pathname + (url.search || url.hash ? "?..." : "");
    return (url.origin + path).slice(0, 160);
  }

  function getLegacyEntrypointRecovery(url: URL): "auth" | "miniapp" | null {
    if (url.searchParams.get("legacy-miniapp") === "rerouted" || isLegacyMiniAppShellPath(url.pathname)) {
      return "miniapp";
    }
    if (url.searchParams.get("legacy-auth") === "blocked" || isLegacyPath(url.pathname)) {
      return "auth";
    }

    return getLegacyRootQueryEntrypoint(url) ?? getLegacyHashEntrypoint(url);
  }

  function recoverLegacyEntrypointLocation(trigger?: string) {
    let url: URL;
    try {
      url = new nativeWindow.URL(nativeWindow.location.href);
    } catch {
      return;
    }

    const recovery = getLegacyEntrypointRecovery(url);
    if (!recovery) return;

    const nextSearch = new nativeWindow.URLSearchParams();
    if (url.searchParams.get("debug") === "world") {
      nextSearch.set("debug", "world");
    }
    const search = nextSearch.toString();
    const preserveCurrentPath = Boolean(trigger) && !isLegacyPath(url.pathname) && !isLegacyRootQueryNavigation(url);
    const pathname = preserveCurrentPath ? url.pathname : "/";
    const targetPath = `${pathname}${search ? `?${search}` : ""}`;

    try {
      nativeWindow.history.replaceState(nativeWindow.history.state, "", targetPath);
    } catch {
      return;
    }

    record(trigger ?? (recovery === "miniapp" ? "early_legacy_miniapp_recovery" : "early_legacy_auth_recovery"), url);
  }

  function record(trigger: string, urlOrTarget: URL | string) {
    const target = typeof urlOrTarget === "string" ? urlOrTarget : sanitize(urlOrTarget);
    const attempts = Array.isArray(nativeWindow.__veripostEarlyBlockedNavigations)
      ? nativeWindow.__veripostEarlyBlockedNavigations
      : [];
    attempts.push({ trigger, target });
    nativeWindow.__veripostEarlyBlockedNavigations = attempts.slice(-30);
    reportEarlyBlockedNavigation(trigger, target);
  }

  function reportEarlyBlockedNavigation(trigger: string, target: string) {
    reportEarlyRuntimeDiagnostic(
      "world_external_navigation_blocked",
      `Blocked ${trigger} navigation to ${target} before React hydration.`,
    );
  }

  function reportEarlyRuntimeInitial() {
    if (nativeWindow.__veripostEarlyRuntimeInitialReported) return;
    if (!hasEarlyWorldAppSurfaceForInitialDiagnostics()) return;

    nativeWindow.__veripostEarlyRuntimeInitialReported = true;
    reportEarlyRuntimeDiagnostic("world_runtime_initial");
  }

  function reportEarlyRuntimeDiagnostic(event: string, errorMessage?: string) {
    const body = JSON.stringify({
      event,
      sessionId: createEarlyNavigationSessionId(),
      ...(errorMessage ? { errorMessage } : {}),
      phase: "loading",
      diagnostics: createEarlyNavigationDiagnostics(),
    });

    try {
      if (typeof nativeWindow.navigator.sendBeacon === "function") {
        const sent = nativeWindow.navigator.sendBeacon(
          "/api/runtime-diagnostics",
          new nativeWindow.Blob([body], { type: "application/json" }),
        );
        if (sent) return;
      }
    } catch {}

    try {
      if (typeof nativeWindow.fetch === "function") {
        void nativeWindow.fetch("/api/runtime-diagnostics", {
          method: "POST",
          credentials: "same-origin",
          keepalive: true,
          headers: { "content-type": "application/json" },
          body,
        }).catch(() => undefined);
      }
    } catch {}
  }

  function hasEarlyWorldAppSurfaceForInitialDiagnostics() {
    return Boolean(
      nativeWindow.WorldApp ||
        nativeWindow.worldApp ||
        nativeWindow.world_app ||
        hasEarlyLikelyWorldAppTransport() ||
        /world ?app|worldcoin/i.test(nativeWindow.navigator.userAgent ?? ""),
    );
  }

  function hasEarlyLikelyWorldAppTransport() {
    const iosHandlers = nativeWindow.webkit?.messageHandlers;
    for (const key of ["minikit", "miniKit", "MiniKit", "mini-kit", "mini_kit", "worldApp", "WorldApp", "worldapp", "world-app", "world_app"] as const) {
      if (typeof iosHandlers?.[key]?.postMessage === "function") return true;
    }

    return Boolean(
      nativeWindow.MiniKitAndroid?.postMessage ||
        nativeWindow.miniKitAndroid?.postMessage ||
        nativeWindow.WorldAppAndroid?.postMessage ||
        nativeWindow.worldAppAndroid?.postMessage,
    );
  }

  function createEarlyNavigationSessionId() {
    try {
      if (typeof nativeWindow.crypto?.randomUUID === "function") return nativeWindow.crypto.randomUUID();
    } catch {}

    return `early-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function createEarlyNavigationDiagnostics() {
    const miniKit = nativeWindow.MiniKit ?? nativeWindow.miniKit;
    return {
      flowVersion: "world-miniapp-idkit-native-2026-06-01",
      worldAppRuntime: Boolean(nativeWindow.WorldApp || nativeWindow.worldApp || nativeWindow.world_app),
      nativeTransport: hasEarlyNativeTransport(),
      worldAppUserAgent: /world ?app|worldcoin/i.test(nativeWindow.navigator.userAgent ?? ""),
      walletAddress: "missing",
      accountSource: "missing",
      accountSourceDetail: "missing",
      orbVerified: null,
      worldAppVersion: null,
      deviceOS: null,
      launchLocation: null,
      openOrigin: null,
      miniKitBridge: {
        trigger: typeof miniKit?.trigger === "function",
        subscribe: typeof miniKit?.subscribe === "function",
        unsubscribe: typeof miniKit?.unsubscribe === "function",
      },
      worldAppInit: {
        attempted: false,
        success: null,
        attempts: 0,
        transport: "missing",
        stateContainer: "missing",
        errorCode: null,
        errorMessage: null,
      },
      worldAppKeys: [],
      worldAppShapeKeys: [],
      miniKitUserKeys: [],
    };
  }

  function blockIfNeeded(target: unknown, trigger: string) {
    const url = toUrl(target);
    if (!url) return false;
    if (
      url.origin === nativeWindow.location.origin &&
      !isLegacyPath(url.pathname) &&
      !isLegacyRootQueryNavigation(url) &&
      !isLegacyHashNavigation(url)
    ) {
      return false;
    }
    if (url.origin !== nativeWindow.location.origin && isAllowedPostProofNavigation(url)) return false;
    record(trigger, url);
    return true;
  }

  installEarlyNativeCommandGuard();
  installEarlyNativeCommandGuardRefresh();
  reportEarlyRuntimeInitial();
  recoverLegacyEntrypointLocation();

  const handleClick = (event: Event) => {
    const anchor =
      event.target instanceof nativeWindow.Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
    if (!anchor || !blockIfNeeded(anchor.href, "early_anchor")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  nativeWindow.document.addEventListener("click", handleClick, true);
  cleanup.push(() => nativeWindow.document.removeEventListener("click", handleClick, true));

  const handleSubmit = (event: Event) => {
    const form = event.target instanceof nativeWindow.HTMLFormElement ? event.target : null;
    if (!form || !blockIfNeeded(form.action, "early_form")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  nativeWindow.document.addEventListener("submit", handleSubmit, true);
  cleanup.push(() => nativeWindow.document.removeEventListener("submit", handleSubmit, true));

  installFormMethodGuards();
  installBeforeUnloadGuard();

  const originalOpen = nativeWindow.open;
  if (typeof originalOpen === "function") {
    nativeWindow.open = function guardedOpen(url?: string | URL, target?: string, features?: string) {
      if (url !== undefined && blockIfNeeded(url, "early_window_open")) return null;
      return originalOpen.call(nativeWindow, url, target, features);
    };
    cleanup.push(() => {
      nativeWindow.open = originalOpen;
    });
  }

  for (const method of ["assign", "replace"] as const) {
    try {
      const original = nativeWindow.location[method].bind(nativeWindow.location);
      Object.defineProperty(nativeWindow.location, method, {
        configurable: true,
        value: (url: string | URL) => {
          if (blockIfNeeded(url, method === "assign" ? "early_location_assign" : "early_location_replace")) return;
          original(url);
        },
        writable: true,
      });
      cleanup.push(() => {
        try {
          Object.defineProperty(nativeWindow.location, method, {
            configurable: true,
            value: original,
            writable: true,
          });
        } catch {}
      });
    } catch {}
  }

  const navigation = nativeWindow.navigation as NavigationLike | undefined;
  if (navigation?.addEventListener) {
    const handleNavigate = (event: Event) => {
      const target = (event as NavigationEventLike).destination?.url;
      if (!target || !blockIfNeeded(target, "early_navigation_api")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    navigation.addEventListener("navigate", handleNavigate, true);
    cleanup.push(() => navigation.removeEventListener?.("navigate", handleNavigate, true));
  }

  installHistoryMethodGuards();
  installCurrentLocationRecoveryGuards();

  nativeWindow.__veripostEarlyNavigationGuardCleanup = () => {
    while (cleanup.length > 0) cleanup.pop()?.();
    nativeWindow.__veripostEarlyNavigationGuardInstalled = false;
  };

  function installFormMethodGuards() {
    const formPrototype = nativeWindow.HTMLFormElement?.prototype;
    if (!formPrototype) return;

    const originalSubmit = formPrototype.submit;
    if (typeof originalSubmit === "function") {
      const guardedSubmit = function guardedSubmit(this: HTMLFormElement) {
        if (blockIfNeeded(this.action, "early_form_submit_method")) return;
        return originalSubmit.call(this);
      };

      try {
        Object.defineProperty(formPrototype, "submit", {
          configurable: true,
          value: guardedSubmit,
          writable: true,
        });
        cleanup.push(() => {
          if (formPrototype.submit !== guardedSubmit) return;
          try {
            Object.defineProperty(formPrototype, "submit", {
              configurable: true,
              value: originalSubmit,
              writable: true,
            });
          } catch {}
        });
      } catch {}
    }

    const originalRequestSubmit = formPrototype.requestSubmit;
    if (typeof originalRequestSubmit === "function") {
      const guardedRequestSubmit = function guardedRequestSubmit(
        this: HTMLFormElement,
        submitter?: HTMLElement | null,
      ) {
        if (blockIfNeeded(getFormSubmissionAction(this, submitter), "early_form_request_submit")) return;
        return originalRequestSubmit.call(this, submitter);
      };

      try {
        Object.defineProperty(formPrototype, "requestSubmit", {
          configurable: true,
          value: guardedRequestSubmit,
          writable: true,
        });
        cleanup.push(() => {
          if (formPrototype.requestSubmit !== guardedRequestSubmit) return;
          try {
            Object.defineProperty(formPrototype, "requestSubmit", {
              configurable: true,
              value: originalRequestSubmit,
              writable: true,
            });
          } catch {}
        });
      } catch {}
    }
  }

  function installHistoryMethodGuards() {
    for (const method of ["pushState", "replaceState"] as const) {
      try {
        const original = nativeWindow.history[method].bind(nativeWindow.history);
        Object.defineProperty(nativeWindow.history, method, {
          configurable: true,
          value: (data: unknown, unused: string, url?: string | URL | null) => {
            if (
              url !== undefined &&
              url !== null &&
              blockIfNeeded(url, method === "pushState" ? "early_history_push_state" : "early_history_replace_state")
            ) {
              return;
            }

            return original(data, unused, url);
          },
          writable: true,
        });
        cleanup.push(() => {
          try {
            Object.defineProperty(nativeWindow.history, method, {
              configurable: true,
              value: original,
              writable: true,
            });
          } catch {}
        });
      } catch {}
    }
  }

  function installCurrentLocationRecoveryGuards() {
    const handleHashChange = () => {
      recoverLegacyEntrypointLocation("early_hashchange");
    };
    const handlePopState = () => {
      recoverLegacyEntrypointLocation("early_popstate");
    };

    nativeWindow.addEventListener("hashchange", handleHashChange, true);
    nativeWindow.addEventListener("popstate", handlePopState, true);
    cleanup.push(() => {
      nativeWindow.removeEventListener("hashchange", handleHashChange, true);
      nativeWindow.removeEventListener("popstate", handlePopState, true);
    });
  }

  function getFormSubmissionAction(form: HTMLFormElement, submitter: HTMLElement | null | undefined) {
    const submitterAction = "formAction" in (submitter ?? {})
      ? (submitter as HTMLButtonElement | HTMLInputElement).formAction
      : "";
    return submitterAction || form.action;
  }

  function installBeforeUnloadGuard() {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (nativeWindow.__veripostAllowPostProofNavigation || !hasWorldAppSurface()) return;

      record("early_beforeunload", "unknown");
      event.preventDefault();
      event.returnValue = "";
    };

    nativeWindow.addEventListener("beforeunload", handleBeforeUnload);
    cleanup.push(() => nativeWindow.removeEventListener("beforeunload", handleBeforeUnload));
  }

  function hasWorldAppSurface() {
    return Boolean(
      nativeWindow.WorldApp ||
        nativeWindow.worldApp ||
        nativeWindow.world_app ||
        hasEarlyNativeTransport() ||
        /world ?app|worldcoin/i.test(nativeWindow.navigator.userAgent ?? ""),
    );
  }

  function hasEarlyNativeTransport() {
    return Boolean(
      getEarlyIosMessageHandlerPostMessage() ||
        getEarlyAndroidPostMessage(),
    );
  }

  function getEarlyIosMessageHandlerPostMessage() {
    const handlers = nativeWindow.webkit?.messageHandlers;
    return handlers?.minikit?.postMessage ||
      handlers?.miniKit?.postMessage ||
      handlers?.MiniKit?.postMessage ||
      handlers?.["mini-kit"]?.postMessage ||
      handlers?.mini_kit?.postMessage ||
      handlers?.worldApp?.postMessage ||
      handlers?.WorldApp?.postMessage ||
      handlers?.worldapp?.postMessage ||
      handlers?.["world-app"]?.postMessage ||
      handlers?.world_app?.postMessage;
  }

  function getEarlyAndroidPostMessage() {
    return nativeWindow.Android?.postMessage ||
      nativeWindow.android?.postMessage ||
      nativeWindow.MiniKitAndroid?.postMessage ||
      nativeWindow.miniKitAndroid?.postMessage ||
      nativeWindow.WorldAppAndroid?.postMessage ||
      nativeWindow.worldAppAndroid?.postMessage ||
      nativeWindow.ReactNativeWebView?.postMessage ||
      nativeWindow.reactNativeWebView?.postMessage;
  }

  function installEarlyNativeCommandGuard() {
    if (!hasWorldAppSurface()) return;

    for (const target of getEarlyNativePostMessageTargets()) {
      guardEarlyNativePostMessageTarget(target);
    }
  }

  function installEarlyNativeCommandGuardRefresh() {
    if (typeof nativeWindow.setInterval !== "function" || typeof nativeWindow.clearInterval !== "function") return;

    const intervalId = nativeWindow.setInterval(() => {
      installEarlyNativeCommandGuard();
    }, 50);
    const timeoutId = typeof nativeWindow.setTimeout === "function"
      ? nativeWindow.setTimeout(() => {
        nativeWindow.clearInterval(intervalId);
      }, 5_000)
      : undefined;

    cleanup.push(() => {
      nativeWindow.clearInterval(intervalId);
      if (timeoutId !== undefined && typeof nativeWindow.clearTimeout === "function") {
        nativeWindow.clearTimeout(timeoutId);
      }
    });
  }

  function getEarlyNativePostMessageTargets() {
    const targets: EarlyNativePostMessageTarget[] = [];
    const seenTargets = new Set<EarlyNativePostMessageTarget>();
    const addTarget = (target: EarlyNativePostMessageTarget | undefined) => {
      if (!target || typeof target.postMessage !== "function" || seenTargets.has(target)) return;
      seenTargets.add(target);
      targets.push(target);
    };

    const handlers = nativeWindow.webkit?.messageHandlers;
    for (const key of [
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
    ]) {
      addTarget(handlers?.[key]);
    }

    const nativeRecord = nativeWindow as unknown as Record<string, EarlyNativePostMessageTarget | undefined>;
    for (const key of [
      "Android",
      "android",
      "MiniKitAndroid",
      "miniKitAndroid",
      "WorldAppAndroid",
      "worldAppAndroid",
      "ReactNativeWebView",
      "reactNativeWebView",
    ]) {
      addTarget(nativeRecord[key]);
    }

    return targets;
  }

  function guardEarlyNativePostMessageTarget(target: EarlyNativePostMessageTarget) {
    const originalPostMessage = target.postMessage;
    if (typeof originalPostMessage !== "function") return;

    const guardMarker = nativeWindow.Symbol.for("veripost.native-post-message-guarded");
    if ((originalPostMessage as unknown as Record<symbol, unknown>)[guardMarker]) return;

    const guardedPostMessage = (payload: unknown) => {
      const commandName = getEarlyNativeCommandName(payload);
      if (commandName && !isAllowedEarlyNativeCommand(commandName)) {
        record("early_native_command", "native-command=blocked");
        reportBlockedEarlyNativeCommand(commandName);
        return;
      }

      return originalPostMessage.call(target, payload);
    };
    Object.defineProperty(guardedPostMessage, guardMarker, {
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
        return;
      }
    }

    cleanup.push(() => {
      if (target.postMessage !== guardedPostMessage) return;
      try {
        Object.defineProperty(target, "postMessage", {
          configurable: true,
          value: originalPostMessage,
          writable: true,
        });
      } catch {
        try {
          target.postMessage = originalPostMessage;
        } catch {}
      }
    });
  }

  function getEarlyNativeCommandName(payload: unknown) {
    const parsedPayload = parseEarlyNativePayload(payload);
    if (!parsedPayload || typeof parsedPayload !== "object") return undefined;

    const command = (parsedPayload as Record<string, unknown>).command;
    if (typeof command !== "string") return undefined;
    return command.trim().slice(0, 80);
  }

  function isAllowedEarlyNativeCommand(commandName: string) {
    const normalizedCommand = commandName.toLowerCase();
    if (normalizedCommand === "init") return true;
    if (normalizedCommand !== "verify") return false;

    const allowanceUntil = nativeWindow.__veripostAllowNativeWorldIdkitVerifyUntil;
    return typeof allowanceUntil === "number" && allowanceUntil > nativeWindow.Date.now();
  }

  function parseEarlyNativePayload(payload: unknown) {
    if (typeof payload !== "string") return payload;

    try {
      return nativeWindow.JSON.parse(payload) as unknown;
    } catch {
      return payload;
    }
  }

  function reportBlockedEarlyNativeCommand(commandName: string) {
    if (typeof nativeWindow.dispatchEvent !== "function" || typeof nativeWindow.CustomEvent !== "function") return;

    try {
      nativeWindow.dispatchEvent(new nativeWindow.CustomEvent("veripost:native-command-blocked", {
        detail: {
          command: commandName.replace(/[^a-z0-9_-]/gi, "").slice(0, 40),
        },
      }));
    } catch {}
  }
}
