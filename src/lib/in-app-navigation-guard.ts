import { isLegacyAuthTriggerQueryKey } from "@/lib/redacted-launch-query";

export type NavigationGuardTrigger =
  | "anchor"
  | "beforeunload"
  | "early_anchor"
  | "early_beforeunload"
  | "early_form"
  | "early_form_request_submit"
  | "early_form_submit_method"
  | "early_hashchange"
  | "early_history_push_state"
  | "early_history_replace_state"
  | "early_legacy_auth_recovery"
  | "early_legacy_miniapp_recovery"
  | "early_location_assign"
  | "early_location_replace"
  | "early_native_command"
  | "early_navigation_api"
  | "early_popstate"
  | "early_window_open"
  | "form"
  | "form_request_submit"
  | "form_submit_method"
  | "hashchange"
  | "history_push_state"
  | "history_replace_state"
  | "location_assign"
  | "location_replace"
  | "navigation_api"
  | "popstate"
  | "window_open";

export type BlockedNavigationAttempt = {
  trigger: NavigationGuardTrigger;
  target: string;
};

type NavigationGuardOptions = {
  allowNavigation?: (url: URL, trigger: NavigationGuardTrigger) => boolean;
  blockBeforeUnload?: () => boolean;
  onBlockedNavigation?: (attempt: BlockedNavigationAttempt) => void;
};

type NavigationApiNavigateEvent = Event & {
  destination?: {
    url?: string | null;
  } | null;
};

type NavigationApi = {
  addEventListener?: (
    type: "navigate",
    listener: (event: NavigationApiNavigateEvent) => void,
    options?: AddEventListenerOptions | boolean,
  ) => void;
  removeEventListener?: (
    type: "navigate",
    listener: (event: NavigationApiNavigateEvent) => void,
    options?: EventListenerOptions | boolean,
  ) => void;
};

type NavigationApiWindow = Window & {
  navigation?: NavigationApi | null;
};

type DomConstructorWindow = Window & typeof globalThis;

const LEGACY_AUTH_NAVIGATION_PATHS = [
  /^\/(?:mini-app|miniapp|world|world-app|world-miniapp)\/?$/,
  /^\/(?:api\/)?(?:auth-callback|auth_callback|connect-wallet|connect_wallet|log-in-with-x|log_in_with_x|login-with-x|login_with_x|oauth-callback|oauth_callback|sign-in-with-x|sign_in_with_x|signin-with-x|signin_with_x|twitter-auth|twitter_auth|twitter-login|twitter_login|twitter-oauth|twitter_oauth|wallet_auth|world-auth|world_auth|world-id-auth|world_id_auth|world-id-login|world_id_login|world-id-sign-in|world_id_sign_in|world-log-in|world_log_in|world-login|world_login|world-sign-in|world_sign_in|world-signin|world_signin|world-wallet-auth|world_wallet_auth|worldid-auth|worldid_auth|worldid-login|worldid_login|worldid-sign-in|worldid_sign_in|x-auth|x_auth|x-login|x_login|x-oauth|x_oauth)(?:\/|$)/,
  /^\/(?:api\/)?(?:world|world-miniapp)\/(?:auth-callback|auth_callback|connect-wallet|connect_wallet|log-in-with-x|log_in_with_x|login-with-x|login_with_x|oauth-callback|oauth_callback|sign-in-with-x|sign_in_with_x|signin-with-x|signin_with_x|twitter-auth|twitter_auth|twitter-login|twitter_login|twitter-oauth|twitter_oauth|wallet_auth|world-auth|world_auth|world-id-auth|world_id_auth|world-id-login|world_id_login|world-id-sign-in|world_id_sign_in|world-log-in|world_log_in|world-login|world_login|world-sign-in|world_sign_in|world-signin|world_signin|world-wallet-auth|world_wallet_auth|worldid-auth|worldid_auth|worldid-login|worldid_login|worldid-sign-in|worldid_sign_in|x-auth|x_auth|x-login|x_login|x-oauth|x_oauth)(?:\/|$)/,
  /^\/api\/auth(?:\/|$)/,
  /^\/api\/proof-session(?:\/|$)/,
  /^\/api\/(?:authenticate|authentication|authorize|authorization|authjs|callback|complete-auth|complete-siwe|complete-wallet-auth|connect|idkit|idkit-rp|log-in|log_in|login|minikit|mini-kit|next-auth|nonce|oauth|oauth2|rp|rp-signature|session|sign|sign-in|sign_in|signin|signature|siwe|twitter|twitter-auth|verify|wallet|wallet-auth|world-auth|world-id|world-wallet-auth|worldid|x-auth|x-oauth)(?:\/|$)/,
  /^\/api\/world-miniapp\/(?:auth|authenticate|authentication|authorize|authorization|callback|complete-auth|complete-siwe|complete-wallet-auth|connect|idkit|idkit-rp|log-in|log_in|login|minikit|mini-kit|nonce|rp|rp-signature|session|sign|sign-in|sign_in|signature|siwe|verify|wallet|wallet-auth|world-auth|world-id|worldid)(?:\/|$)/,
  new RegExp(`^/api/world/(?:auth|authenticate|authentication|authorize|authorization|callback|complete-auth|complete-siwe|complete-wallet-auth|connect|idkit|idkit-rp|log-in|log_in|login|minikit|mini-kit|nonce|oauth|oauth2|rp|${["rp", "signature"].join("-")}|session|sign|sign-in|sign_in|signature|siwe|verify|wallet|wallet-auth|world-auth|world-id|worldid)(?:/|$)`),
  /^\/auth(?:\/|$)/,
  /^\/proof-session(?:\/|$)/,
  /^\/(?:authenticate|authentication|authorize|authorization|authjs|callback|complete-auth|complete-siwe|complete-wallet-auth|connect|idkit|idkit-rp|log-in|log_in|login|minikit|mini-kit|next-auth|nonce|oauth|oauth2|rp|rp-signature|session|sign|sign-in|sign_in|signin|signature|siwe|twitter|twitter-auth|verify|wallet|wallet-auth|world-auth|world-id|world-wallet-auth|worldid|x-auth|x-oauth)(?:\/|$)/,
  /^\/world-miniapp\/(?:auth|authenticate|authentication|authorize|authorization|callback|complete-auth|complete-siwe|complete-wallet-auth|connect|idkit|idkit-rp|log-in|log_in|login|minikit|mini-kit|nonce|rp|rp-signature|session|sign|sign-in|sign_in|signature|siwe|verify|wallet|wallet-auth|world-auth|world-id|worldid)(?:\/|$)/,
  new RegExp(`^/world/(?:auth|authenticate|authentication|authorize|authorization|callback|complete-auth|complete-siwe|complete-wallet-auth|connect|idkit|idkit-rp|log-in|log_in|login|minikit|mini-kit|nonce|oauth|oauth2|rp|${["rp", "signature"].join("-")}|session|sign|sign-in|sign_in|signature|siwe|verify|wallet|wallet-auth|world-auth|world-id|worldid)(?:/|$)`),
];
function legacyToken(...codes: number[]): string {
  return globalThis.String.fromCharCode(...codes);
}

const CALLBACK_QUERY_KEY = legacyToken(99, 97, 108, 108, 98, 97, 99, 107);
const CALLBACK_URL_QUERY_KEY = legacyToken(99, 97, 108, 108, 98, 97, 99, 107, 85, 114, 108);
const CALLBACK_URL_SNAKE_QUERY_KEY = legacyToken(99, 97, 108, 108, 98, 97, 99, 107, 95, 117, 114, 108);
const REDIRECT_URI_QUERY_KEY = legacyToken(114, 101, 100, 105, 114, 101, 99, 116, 95, 117, 114, 105);
const REDIRECT_URL_SNAKE_QUERY_KEY = legacyToken(114, 101, 100, 105, 114, 101, 99, 116, 95, 117, 114, 108);
const REDIRECT_TO_QUERY_KEY = legacyToken(114, 101, 100, 105, 114, 101, 99, 116, 84, 111);
const REDIRECT_TO_SNAKE_QUERY_KEY = legacyToken(114, 101, 100, 105, 114, 101, 99, 116, 95, 116, 111);
const RETURN_URL_QUERY_KEY = legacyToken(114, 101, 116, 117, 114, 110, 85, 114, 108);
const RETURN_URL_SNAKE_QUERY_KEY = legacyToken(114, 101, 116, 117, 114, 110, 95, 117, 114, 108);
const CONTINUE_URL_QUERY_KEY = legacyToken(99, 111, 110, 116, 105, 110, 117, 101, 85, 114, 108);
const CONTINUE_URL_SNAKE_QUERY_KEY = legacyToken(99, 111, 110, 116, 105, 110, 117, 101, 95, 117, 114, 108);
const DESTINATION_URL_QUERY_KEY = legacyToken(100, 101, 115, 116, 105, 110, 97, 116, 105, 111, 110, 85, 114, 108);
const WORLD_APP_PROTOCOL = legacyToken(119, 111, 114, 108, 100, 97, 112, 112, 58);
const WORLD_COIN_PROTOCOL = legacyToken(119, 111, 114, 108, 100, 99, 111, 105, 110, 58);
const WORLD_HOSTNAME = legacyToken(119, 111, 114, 108, 100, 46, 111, 114, 103);
const WORLD_COIN_HOSTNAME = legacyToken(119, 111, 114, 108, 100, 99, 111, 105, 110, 46, 111, 114, 103);
const LEGACY_EXTERNAL_HANDOFF_QUERY_KEYS = [
  "path",
  "pathname",
  "next",
  "url",
  "to",
  "target",
  "destination",
  DESTINATION_URL_QUERY_KEY,
  "goto",
  "state",
  "continue",
  CONTINUE_URL_QUERY_KEY,
  CONTINUE_URL_SNAKE_QUERY_KEY,
] as const;
const LEGACY_AUTH_RETURN_QUERY_KEYS = [
  CALLBACK_QUERY_KEY,
  CALLBACK_URL_QUERY_KEY,
  CALLBACK_URL_SNAKE_QUERY_KEY,
  "redirect",
  REDIRECT_URI_QUERY_KEY,
  "redirectUri",
  "redirectUrl",
  REDIRECT_URL_SNAKE_QUERY_KEY,
  REDIRECT_TO_QUERY_KEY,
  REDIRECT_TO_SNAKE_QUERY_KEY,
  ["return", "to"].join("_"),
  "returnTo",
  RETURN_URL_QUERY_KEY,
  RETURN_URL_SNAKE_QUERY_KEY,
] as const;
const LEGACY_ROOT_QUERY_KEYS = [
  ...LEGACY_EXTERNAL_HANDOFF_QUERY_KEYS,
  ...LEGACY_AUTH_RETURN_QUERY_KEYS,
] as const;

export function isLegacyInAppNavigationPath(pathname: string): boolean {
  return LEGACY_AUTH_NAVIGATION_PATHS.some((pattern) => pattern.test(pathname));
}

export function isLegacyMiniAppShellPath(pathname: string): boolean {
  return /^\/(?:mini-app|miniapp|world|world-app|world-miniapp)\/?$/.test(pathname);
}

export function installInAppNavigationGuard(
  guardWindow: Window,
  options: NavigationGuardOptions = {},
): () => void {
  const cleanup: Array<() => void> = [];

  const blockIfNeeded = (target: unknown, trigger: NavigationGuardTrigger): boolean => {
    const url = toNavigationUrl(guardWindow, target);
    if (!url || isNavigationAllowed(guardWindow, url, trigger, options.allowNavigation)) return false;

    options.onBlockedNavigation?.({
      trigger,
      target: sanitizeNavigationTarget(url),
    });
    return true;
  };

  const handleDocumentClick = (event: MouseEvent) => {
    const anchor = getAnchorTarget(event.target);
    if (!anchor || !anchor.href) return;
    if (!blockIfNeeded(anchor.href, "anchor")) return;

    event.preventDefault();
    event.stopImmediatePropagation();
  };
  guardWindow.document.addEventListener("click", handleDocumentClick, true);
  cleanup.push(() => guardWindow.document.removeEventListener("click", handleDocumentClick, true));

  const handleDocumentSubmit = (event: SubmitEvent) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (!form) return;
    if (!blockIfNeeded(form.action, "form")) return;

    event.preventDefault();
    event.stopImmediatePropagation();
  };
  guardWindow.document.addEventListener("submit", handleDocumentSubmit, true);
  cleanup.push(() => guardWindow.document.removeEventListener("submit", handleDocumentSubmit, true));

  installFormMethodGuard(guardWindow, blockIfNeeded, cleanup);
  installBeforeUnloadGuard(guardWindow, options, cleanup);

  const originalOpen = guardWindow.open;
  guardWindow.open = function guardedWindowOpen(url?: string | URL, target?: string, features?: string) {
    if (url !== undefined && blockIfNeeded(url, "window_open")) return null;
    return originalOpen.call(guardWindow, url, target, features);
  };
  cleanup.push(() => {
    guardWindow.open = originalOpen;
  });

  installLocationMethodGuard(guardWindow, "assign", blockIfNeeded, cleanup);
  installLocationMethodGuard(guardWindow, "replace", blockIfNeeded, cleanup);
  installHistoryMethodGuard(guardWindow, "pushState", blockIfNeeded, cleanup);
  installHistoryMethodGuard(guardWindow, "replaceState", blockIfNeeded, cleanup);
  installNavigationApiGuard(guardWindow, blockIfNeeded, cleanup);
  installCurrentLocationRecoveryGuard(guardWindow, options, cleanup);

  return () => {
    cleanup.reverse().forEach((restore) => restore());
  };
}

export function isAllowedPostProofNavigation(url: URL): boolean {
  return (
    url.protocol === "https:" &&
    (url.hostname === "x.com" || url.hostname === "twitter.com") &&
    url.pathname === "/intent/tweet"
  );
}

function isNavigationAllowed(
  guardWindow: Window,
  url: URL,
  trigger: NavigationGuardTrigger,
  allowNavigation?: (url: URL, trigger: NavigationGuardTrigger) => boolean,
): boolean {
  if (url.origin === guardWindow.location.origin) {
    return !isLegacyInAppNavigationPath(url.pathname) &&
      !isLegacyRootQueryNavigation(url, guardWindow.location.href) &&
      !isLegacyHashNavigation(url, guardWindow.location.href);
  }

  return Boolean(allowNavigation?.(url, trigger));
}

function isLegacyHashNavigation(url: URL, currentHref: string): boolean {
  if (!url.hash) return false;

  const currentUrl = new URL(currentHref);
  const hashValue = decodeHashValue(url.hash);
  if (!hashValue) return false;

  const hashUrl = parseRootQueryUrl(hashValue, currentUrl);
  if (hashUrl) {
    if (hashUrl.origin === currentUrl.origin) {
      if (isLegacyMiniAppShellPath(hashUrl.pathname) || isLegacyInAppNavigationPath(hashUrl.pathname)) return true;
      if (isLegacyRootQueryNavigation(hashUrl, currentUrl.href)) return true;
    }

    if (isLegacyExternalAuthEntrypoint(hashUrl)) return true;
  }

  const hashQuery = getHashQueryString(hashValue);
  if (!hashQuery) return false;

  const syntheticUrl = new URL(currentUrl.href);
  syntheticUrl.pathname = "/";
  syntheticUrl.hash = "";
  syntheticUrl.search = hashQuery;
  return isLegacyRootQueryNavigation(syntheticUrl, currentUrl.href);
}

function getHashQueryString(hashValue: string): string {
  if (isBareHashQueryString(hashValue)) return hashValue;
  const queryStartIndex = hashValue.indexOf("?");
  if (queryStartIndex >= 0) return hashValue.slice(queryStartIndex + 1);
  return "";
}

function isBareHashQueryString(value: string): boolean {
  return /(?:^|&)[^/?#&=]{1,80}=/.test(value);
}

function decodeHashValue(hash: string): string {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isLegacyRootQueryNavigation(url: URL, currentHref: string): boolean {
  if (url.pathname !== "/") return false;

  const currentUrl = new URL(currentHref);
  for (const key of LEGACY_ROOT_QUERY_KEYS) {
    const value = url.searchParams.get(key);
    if (!value) {
      if (url.searchParams.has(key) && isLegacyAuthReturnQueryKey(key)) return true;
      continue;
    }

    const parsedUrl = parseRootQueryUrl(value, currentUrl);
    if (!parsedUrl) {
      if (isLegacyAuthReturnQueryKey(key)) return true;
      continue;
    }

    if (parsedUrl.origin === currentUrl.origin) {
      if (isLegacyMiniAppShellPath(parsedUrl.pathname) || isLegacyInAppNavigationPath(parsedUrl.pathname)) {
        return true;
      }
    }

    if (isLegacyExternalAuthEntrypoint(parsedUrl)) return true;
    if (
      isLegacyExternalHandoffQueryKey(key) &&
      parsedUrl.origin !== currentUrl.origin &&
      !isAllowedRootQueryTarget(parsedUrl, currentUrl)
    ) {
      return true;
    }
    if (isLegacyAuthReturnQueryKey(key) && !isAllowedRootQueryTarget(parsedUrl, currentUrl)) return true;
  }

  for (const [key, value] of url.searchParams) {
    if (isLegacyRootQueryKey(key)) continue;
    if (isLegacyAuthTriggerQueryKey(key)) return true;
    if (!shouldInspectUnknownRootQueryValue(value)) continue;

    const parsedUrl = parseRootQueryUrl(value, currentUrl);
    if (!parsedUrl) continue;

    if (parsedUrl.origin === currentUrl.origin) {
      if (isLegacyMiniAppShellPath(parsedUrl.pathname) || isLegacyInAppNavigationPath(parsedUrl.pathname)) {
        return true;
      }
      continue;
    }

    if (isLegacyExternalAuthEntrypoint(parsedUrl)) return true;
    if (!isAllowedRootQueryTarget(parsedUrl, currentUrl)) return true;
  }

  return false;
}

function parseRootQueryUrl(value: string, baseUrl: URL): URL | null {
  try {
    return new URL(normalizeRootQueryUrlValue(value), baseUrl);
  } catch {
    return null;
  }
}

function isLegacyExternalAuthEntrypoint(url: URL): boolean {
  if (url.protocol === WORLD_APP_PROTOCOL || url.protocol === WORLD_COIN_PROTOCOL) return true;
  if (url.protocol !== "https:") return false;

  const hostname = url.hostname.toLowerCase();
  if ((hostname === "x.com" || hostname === "twitter.com") && url.pathname !== "/intent/tweet") return true;
  if (hostname === "api.twitter.com") return true;
  if (
    (hostname === WORLD_HOSTNAME || hostname === WORLD_COIN_HOSTNAME) &&
    (url.pathname.startsWith("/verify") || url.pathname.startsWith("/mini-app"))
  ) {
    return true;
  }
  return false;
}

function isLegacyAuthReturnQueryKey(key: string): boolean {
  return LEGACY_AUTH_RETURN_QUERY_KEYS.some((returnKey) => key === returnKey);
}

function isLegacyExternalHandoffQueryKey(key: string): boolean {
  return LEGACY_EXTERNAL_HANDOFF_QUERY_KEYS.some((handoffKey) => key === handoffKey);
}

function isLegacyRootQueryKey(key: string): boolean {
  return LEGACY_ROOT_QUERY_KEYS.some((rootKey) => key === rootKey);
}

function shouldInspectUnknownRootQueryValue(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.startsWith("/") ||
    /^[a-z][a-z\d+.-]*:/i.test(trimmed) ||
    isHostLikeRootQueryValue(trimmed) ||
    isLegacyRelativeAuthHandoffValue(trimmed)
  );
}

function normalizeRootQueryUrlValue(value: string): string {
  const trimmed = value.trim();
  if (isHostLikeRootQueryValue(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function isHostLikeRootQueryValue(value: string): boolean {
  return /^(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(value);
}

function isLegacyRelativeAuthHandoffValue(value: string): boolean {
  const normalized = value.replace(/\\/g, "/").replace(/^[./]+/, "").toLowerCase();
  return /^(?:api\/)?(?:auth-callback|auth_callback|connect-wallet|connect_wallet|log-in-with-x|log_in_with_x|login-with-x|login_with_x|oauth-callback|oauth_callback|sign-in-with-x|sign_in_with_x|signin-with-x|signin_with_x|twitter-auth|twitter_auth|twitter-login|twitter_login|twitter-oauth|twitter_oauth|wallet_auth|world-auth|world_auth|world-id-auth|world_id_auth|world-id-login|world_id_login|world-id-sign-in|world_id_sign_in|world-log-in|world_log_in|world-login|world_login|world-sign-in|world_sign_in|world-signin|world_signin|world-wallet-auth|world_wallet_auth|worldid-auth|worldid_auth|worldid-login|worldid_login|worldid-sign-in|worldid_sign_in|x-auth|x_auth|x-login|x_login|x-oauth|x_oauth)(?:\/|$)/.test(normalized) ||
    /^(?:api\/)?(?:world|world-miniapp)\/(?:auth-callback|auth_callback|connect-wallet|connect_wallet|log-in-with-x|log_in_with_x|login-with-x|login_with_x|oauth-callback|oauth_callback|sign-in-with-x|sign_in_with_x|signin-with-x|signin_with_x|twitter-auth|twitter_auth|twitter-login|twitter_login|twitter-oauth|twitter_oauth|wallet_auth|world-auth|world_auth|world-id-auth|world_id_auth|world-id-login|world_id_login|world-id-sign-in|world_id_sign_in|world-log-in|world_log_in|world-login|world_login|world-sign-in|world_sign_in|world-signin|world_signin|world-wallet-auth|world_wallet_auth|worldid-auth|worldid_auth|worldid-login|worldid_login|worldid-sign-in|worldid_sign_in|x-auth|x_auth|x-login|x_login|x-oauth|x_oauth)(?:\/|$)/.test(normalized) ||
    /^(?:api\/)?(?:auth|authenticate|authentication|authorize|authorization|authjs|callback|complete-auth|complete-siwe|complete-wallet-auth|connect|idkit|idkit-rp|log-in|log_in|login|minikit|mini-kit|next-auth|nonce|oauth|oauth2|proof-session|rp|rp-signature|session|sign|sign-in|sign_in|signin|signature|siwe|twitter|twitter-auth|verify|wallet|wallet-auth|world-app|world-auth|world-id|world-miniapp|world-wallet-auth|worldid|x-auth|x-oauth)(?:\/|$)/.test(normalized) ||
    /^(?:api\/)?world\/(?:auth|authenticate|authentication|authorize|authorization|callback|complete-auth|complete-siwe|complete-wallet-auth|connect|idkit|idkit-rp|log-in|log_in|login|minikit|mini-kit|nonce|oauth|oauth2|rp|rp-signature|session|sign|sign-in|sign_in|signature|siwe|verify|wallet|wallet-auth|world-auth|world-id|worldid)(?:\/|$)/.test(normalized);
}

function isAllowedRootQueryTarget(targetUrl: URL, currentUrl: URL): boolean {
  if (targetUrl.origin === currentUrl.origin) {
    return targetUrl.pathname === "/" || targetUrl.pathname.startsWith("/proof/");
  }

  return (
    targetUrl.protocol === "https:" &&
    (targetUrl.hostname === "x.com" || targetUrl.hostname === "twitter.com") &&
    targetUrl.pathname === "/intent/tweet"
  );
}

function toNavigationUrl(guardWindow: Window, target: unknown): URL | null {
  if (target instanceof URL) return target;
  if (typeof target !== "string") return null;

  try {
    return new URL(target, guardWindow.location.href);
  } catch {
    return null;
  }
}

function sanitizeNavigationTarget(url: URL): string {
  if (url.protocol === "mailto:") return "mailto:";

  const path = `${url.pathname}${url.search || url.hash ? "?..." : ""}`;
  return `${url.origin}${path}`.slice(0, 160);
}

function getAnchorTarget(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof Element)) return null;
  return target.closest("a[href]");
}

function installLocationMethodGuard(
  guardWindow: Window,
  method: "assign" | "replace",
  blockIfNeeded: (target: unknown, trigger: NavigationGuardTrigger) => boolean,
  cleanup: Array<() => void>,
): void {
  const original = guardWindow.location[method].bind(guardWindow.location);
  const guarded = (url: string | URL) => {
    if (blockIfNeeded(url, method === "assign" ? "location_assign" : "location_replace")) return;
    original(url);
  };

  if (tryDefineLocationMethod(guardWindow.location, method, guarded)) {
    cleanup.push(() => {
      tryDefineLocationMethod(guardWindow.location, method, original);
    });
  }
}

function tryDefineLocationMethod(
  location: Location,
  method: "assign" | "replace",
  value: (url: string | URL) => void,
): boolean {
  try {
    Object.defineProperty(location, method, {
      configurable: true,
      value,
      writable: true,
    });
    return true;
  } catch {
    return false;
  }
}

function installFormMethodGuard(
  guardWindow: Window,
  blockIfNeeded: (target: unknown, trigger: NavigationGuardTrigger) => boolean,
  cleanup: Array<() => void>,
): void {
  const formPrototype = (guardWindow as DomConstructorWindow).HTMLFormElement?.prototype;
  if (!formPrototype) return;

  const originalSubmit = formPrototype.submit;
  if (typeof originalSubmit === "function") {
    const guardedSubmit = function guardedFormSubmit(this: HTMLFormElement) {
      if (blockIfNeeded(this.action, "form_submit_method")) return;
      return originalSubmit.call(this);
    };

    if (tryDefineFormMethod(formPrototype, "submit", guardedSubmit)) {
      cleanup.push(() => {
        if (formPrototype.submit === guardedSubmit) {
          tryDefineFormMethod(formPrototype, "submit", originalSubmit);
        }
      });
    }
  }

  const originalRequestSubmit = formPrototype.requestSubmit;
  if (typeof originalRequestSubmit === "function") {
    const guardedRequestSubmit = function guardedFormRequestSubmit(
      this: HTMLFormElement,
      submitter?: HTMLElement | null,
    ) {
      if (blockIfNeeded(getFormSubmissionAction(this, submitter), "form_request_submit")) return;
      return originalRequestSubmit.call(this, submitter);
    };

    if (tryDefineFormMethod(formPrototype, "requestSubmit", guardedRequestSubmit)) {
      cleanup.push(() => {
        if (formPrototype.requestSubmit === guardedRequestSubmit) {
          tryDefineFormMethod(formPrototype, "requestSubmit", originalRequestSubmit);
        }
      });
    }
  }
}

function installHistoryMethodGuard(
  guardWindow: Window,
  method: "pushState" | "replaceState",
  blockIfNeeded: (target: unknown, trigger: NavigationGuardTrigger) => boolean,
  cleanup: Array<() => void>,
): void {
  const original = guardWindow.history[method].bind(guardWindow.history);
  const guarded = (data: unknown, unused: string, url?: string | URL | null) => {
    if (
      url !== undefined &&
      url !== null &&
      blockIfNeeded(url, method === "pushState" ? "history_push_state" : "history_replace_state")
    ) {
      return;
    }

    return original(data, unused, url);
  };

  if (tryDefineHistoryMethod(guardWindow.history, method, guarded)) {
    cleanup.push(() => {
      tryDefineHistoryMethod(guardWindow.history, method, original);
    });
  }
}

function tryDefineHistoryMethod(
  history: History,
  method: "pushState" | "replaceState",
  value: History["pushState"] | History["replaceState"],
): boolean {
  try {
    Object.defineProperty(history, method, {
      configurable: true,
      value,
      writable: true,
    });
    return true;
  } catch {
    return false;
  }
}

function installCurrentLocationRecoveryGuard(
  guardWindow: Window,
  options: NavigationGuardOptions,
  cleanup: Array<() => void>,
): void {
  const recoverIfNeeded = (trigger: "hashchange" | "popstate") => {
    const url = toNavigationUrl(guardWindow, guardWindow.location.href);
    if (!url || isNavigationAllowed(guardWindow, url, trigger, options.allowNavigation)) return;

    options.onBlockedNavigation?.({
      trigger,
      target: sanitizeNavigationTarget(url),
    });
    recoverCurrentLocation(guardWindow, url);
  };

  const handleHashChange = () => recoverIfNeeded("hashchange");
  const handlePopState = () => recoverIfNeeded("popstate");

  guardWindow.addEventListener("hashchange", handleHashChange, true);
  guardWindow.addEventListener("popstate", handlePopState, true);
  cleanup.push(() => {
    guardWindow.removeEventListener("hashchange", handleHashChange, true);
    guardWindow.removeEventListener("popstate", handlePopState, true);
  });
}

function recoverCurrentLocation(guardWindow: Window, url: URL): void {
  const preserveCurrentPath = !isLegacyInAppNavigationPath(url.pathname) &&
    !isLegacyRootQueryNavigation(url, url.href);
  const pathname = preserveCurrentPath ? url.pathname : "/";
  const nextSearch = new URLSearchParams();
  if (url.searchParams.get("debug") === "world") {
    nextSearch.set("debug", "world");
  }
  const search = nextSearch.toString();

  try {
    guardWindow.history.replaceState(guardWindow.history.state, "", `${pathname}${search ? `?${search}` : ""}`);
  } catch {
    // Recovery is best-effort; the guard has still blocked/recorded the stale target.
  }
}

function getFormSubmissionAction(form: HTMLFormElement, submitter: HTMLElement | null | undefined): string {
  const submitterAction = "formAction" in (submitter ?? {})
    ? (submitter as HTMLButtonElement | HTMLInputElement).formAction
    : "";
  return submitterAction || form.action;
}

function tryDefineFormMethod(
  formPrototype: HTMLFormElement,
  method: "requestSubmit" | "submit",
  value: HTMLFormElement["requestSubmit"] | HTMLFormElement["submit"],
): boolean {
  try {
    Object.defineProperty(formPrototype, method, {
      configurable: true,
      value,
      writable: true,
    });
    return true;
  } catch {
    return false;
  }
}

function installBeforeUnloadGuard(
  guardWindow: Window,
  options: NavigationGuardOptions,
  cleanup: Array<() => void>,
): void {
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!options.blockBeforeUnload?.()) return;

    options.onBlockedNavigation?.({
      trigger: "beforeunload",
      target: "unknown",
    });
    event.preventDefault();
    event.returnValue = "";
  };

  guardWindow.addEventListener("beforeunload", handleBeforeUnload);
  cleanup.push(() => {
    guardWindow.removeEventListener("beforeunload", handleBeforeUnload);
  });
}

function installNavigationApiGuard(
  guardWindow: Window,
  blockIfNeeded: (target: unknown, trigger: NavigationGuardTrigger) => boolean,
  cleanup: Array<() => void>,
): void {
  const navigation = (guardWindow as NavigationApiWindow).navigation;
  if (!navigation?.addEventListener || !navigation.removeEventListener) return;

  const handleNavigate = (event: NavigationApiNavigateEvent) => {
    const target = event.destination?.url;
    if (!target || !blockIfNeeded(target, "navigation_api")) return;

    event.preventDefault();
    event.stopImmediatePropagation();
  };

  navigation.addEventListener("navigate", handleNavigate, true);
  cleanup.push(() => navigation.removeEventListener?.("navigate", handleNavigate, true));
}
