export const LEGACY_AUTH_COOKIE_NAMES = [
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
  "__Secure-next-auth.csrf-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "__Secure-authjs.csrf-token",
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "veripost-wallet-auth-challenge",
  "__Host-veripost-wallet-auth-challenge",
  "__Secure-veripost-wallet-auth-challenge",
  "world-wallet-auth-challenge",
  "__Host-world-wallet-auth-challenge",
  "__Secure-world-wallet-auth-challenge",
  "world_wallet_auth_challenge",
  "world_wallet_auth_nonce",
] as const;

export const LEGACY_AUTH_COOKIE_PATHS = [
  "/",
  "/api",
  "/api/auth",
  "/api/authjs",
  "/api/authenticate",
  "/api/authentication",
  "/api/authorize",
  "/api/authorization",
  "/api/auth-callback",
  "/api/callback",
  "/api/complete-auth",
  "/api/complete-siwe",
  "/api/complete-wallet-auth",
  "/api/connect",
  "/api/connect-wallet",
  "/api/idkit",
  "/api/idkit-rp",
  "/api/login",
  "/api/minikit",
  "/api/mini-kit",
  "/api/next-auth",
  "/api/nonce",
  "/api/oauth",
  "/api/oauth2",
  "/api/oauth-callback",
  "/api/proof-session",
  "/api/rp",
  "/api/rp-signature",
  "/api/session",
  "/api/sign",
  "/api/signin",
  "/api/signature",
  "/api/siwe",
  "/api/twitter",
  "/api/twitter-auth",
  "/api/verify",
  "/api/wallet",
  "/api/wallet-auth",
  "/api/world",
  "/api/world/authenticate",
  "/api/world/authentication",
  "/api/world/authorize",
  "/api/world/authorization",
  "/api/world/auth-callback",
  "/api/world/callback",
  "/api/world/complete-auth",
  "/api/world/complete-siwe",
  "/api/world/complete-wallet-auth",
  "/api/world/connect",
  "/api/world/connect-wallet",
  "/api/world/idkit",
  "/api/world/idkit-rp",
  "/api/world/log-in",
  "/api/world/log_in",
  "/api/world/login",
  "/api/world/minikit",
  "/api/world/mini-kit",
  "/api/world/nonce",
  "/api/world/oauth",
  "/api/world/oauth2",
  "/api/world/oauth-callback",
  "/api/world/rp",
  "/api/world/rp-signature",
  "/api/world/session",
  "/api/world/sign",
  "/api/world/sign-in",
  "/api/world/sign_in",
  "/api/world/signature",
  "/api/world/siwe",
  "/api/world/verify",
  "/api/world/wallet",
  "/api/world/wallet-auth",
  "/api/world/world-auth",
  "/api/world/world-id-auth",
  "/api/world/world-id-login",
  "/api/world/world-id-sign-in",
  "/api/world/world-log-in",
  "/api/world/world-login",
  "/api/world/world-sign-in",
  "/api/world/world-signin",
  "/api/world/worldid-auth",
  "/api/world/worldid-login",
  "/api/world/worldid-sign-in",
  "/api/world-miniapp",
  "/api/world-miniapp/authenticate",
  "/api/world-miniapp/authentication",
  "/api/world-miniapp/authorize",
  "/api/world-miniapp/authorization",
  "/api/world-miniapp/auth-callback",
  "/api/world-miniapp/callback",
  "/api/world-miniapp/complete-auth",
  "/api/world-miniapp/complete-siwe",
  "/api/world-miniapp/complete-wallet-auth",
  "/api/world-miniapp/connect",
  "/api/world-miniapp/connect-wallet",
  "/api/world-miniapp/idkit",
  "/api/world-miniapp/idkit-rp",
  "/api/world-miniapp/log-in",
  "/api/world-miniapp/log_in",
  "/api/world-miniapp/login",
  "/api/world-miniapp/minikit",
  "/api/world-miniapp/mini-kit",
  "/api/world-miniapp/nonce",
  "/api/world-miniapp/oauth-callback",
  "/api/world-miniapp/rp",
  "/api/world-miniapp/rp-signature",
  "/api/world-miniapp/session",
  "/api/world-miniapp/sign",
  "/api/world-miniapp/sign-in",
  "/api/world-miniapp/sign_in",
  "/api/world-miniapp/signature",
  "/api/world-miniapp/siwe",
  "/api/world-miniapp/verify",
  "/api/world-miniapp/wallet",
  "/api/world-miniapp/wallet-auth",
  "/api/world-miniapp/world-auth",
  "/api/world-miniapp/world-id-auth",
  "/api/world-miniapp/world-id-login",
  "/api/world-miniapp/world-id-sign-in",
  "/api/world-miniapp/world-log-in",
  "/api/world-miniapp/world-login",
  "/api/world-miniapp/world-sign-in",
  "/api/world-miniapp/world-signin",
  "/api/world-miniapp/worldid-auth",
  "/api/world-miniapp/worldid-login",
  "/api/world-miniapp/worldid-sign-in",
  "/api/log-in",
  "/api/log_in",
  "/api/login-with-x",
  "/api/log-in-with-x",
  "/api/sign-in",
  "/api/sign_in",
  "/api/sign-in-with-x",
  "/api/signin-with-x",
  "/api/twitter-login",
  "/api/twitter-oauth",
  "/api/world-auth",
  "/api/world-id-auth",
  "/api/world-id-login",
  "/api/world-id-sign-in",
  "/api/world-log-in",
  "/api/world-login",
  "/api/world-sign-in",
  "/api/world-signin",
  "/api/worldid-auth",
  "/api/worldid-login",
  "/api/worldid-sign-in",
  "/api/world-id",
  "/api/worldid",
  "/api/world-wallet-auth",
  "/api/x-auth",
  "/api/x-login",
  "/api/x-oauth",
  "/auth",
  "/authjs",
  "/authenticate",
  "/authentication",
  "/authorize",
  "/authorization",
  "/auth-callback",
  "/callback",
  "/complete-auth",
  "/complete-siwe",
  "/complete-wallet-auth",
  "/connect",
  "/connect-wallet",
  "/idkit",
  "/idkit-rp",
  "/log-in",
  "/log_in",
  "/login",
  "/login-with-x",
  "/log-in-with-x",
  "/minikit",
  "/mini-kit",
  "/next-auth",
  "/nonce",
  "/oauth",
  "/oauth2",
  "/oauth-callback",
  "/proof-session",
  "/rp",
  "/rp-signature",
  "/session",
  "/sign",
  "/sign-in",
  "/sign_in",
  "/sign-in-with-x",
  "/signin",
  "/signin-with-x",
  "/signature",
  "/siwe",
  "/twitter",
  "/twitter-auth",
  "/twitter-login",
  "/twitter-oauth",
  "/verify",
  "/wallet",
  "/wallet-auth",
  "/world",
  "/world/authenticate",
  "/world/authentication",
  "/world/authorize",
  "/world/authorization",
  "/world/auth-callback",
  "/world/callback",
  "/world/complete-auth",
  "/world/complete-siwe",
  "/world/complete-wallet-auth",
  "/world/connect",
  "/world/connect-wallet",
  "/world/idkit",
  "/world/idkit-rp",
  "/world/log-in",
  "/world/log_in",
  "/world/login",
  "/world/minikit",
  "/world/mini-kit",
  "/world/nonce",
  "/world/oauth",
  "/world/oauth2",
  "/world/oauth-callback",
  "/world/rp",
  "/world/rp-signature",
  "/world/session",
  "/world/sign",
  "/world/sign-in",
  "/world/sign_in",
  "/world/signature",
  "/world/siwe",
  "/world/verify",
  "/world/wallet",
  "/world/wallet-auth",
  "/world/world-auth",
  "/world/world-id-auth",
  "/world/world-id-login",
  "/world/world-id-sign-in",
  "/world/world-log-in",
  "/world/world-login",
  "/world/world-sign-in",
  "/world/world-signin",
  "/world/worldid-auth",
  "/world/worldid-login",
  "/world/worldid-sign-in",
  "/world-miniapp",
  "/world-miniapp/authenticate",
  "/world-miniapp/authentication",
  "/world-miniapp/authorize",
  "/world-miniapp/authorization",
  "/world-miniapp/auth-callback",
  "/world-miniapp/callback",
  "/world-miniapp/complete-auth",
  "/world-miniapp/complete-siwe",
  "/world-miniapp/complete-wallet-auth",
  "/world-miniapp/connect",
  "/world-miniapp/connect-wallet",
  "/world-miniapp/idkit",
  "/world-miniapp/idkit-rp",
  "/world-miniapp/log-in",
  "/world-miniapp/log_in",
  "/world-miniapp/login",
  "/world-miniapp/minikit",
  "/world-miniapp/mini-kit",
  "/world-miniapp/nonce",
  "/world-miniapp/oauth-callback",
  "/world-miniapp/rp",
  "/world-miniapp/rp-signature",
  "/world-miniapp/session",
  "/world-miniapp/sign",
  "/world-miniapp/sign-in",
  "/world-miniapp/sign_in",
  "/world-miniapp/signature",
  "/world-miniapp/siwe",
  "/world-miniapp/verify",
  "/world-miniapp/wallet",
  "/world-miniapp/wallet-auth",
  "/world-miniapp/world-auth",
  "/world-miniapp/world-id-auth",
  "/world-miniapp/world-id-login",
  "/world-miniapp/world-id-sign-in",
  "/world-miniapp/world-log-in",
  "/world-miniapp/world-login",
  "/world-miniapp/world-sign-in",
  "/world-miniapp/world-signin",
  "/world-miniapp/worldid-auth",
  "/world-miniapp/worldid-login",
  "/world-miniapp/worldid-sign-in",
  "/world-auth",
  "/world-id-auth",
  "/world-id-login",
  "/world-id-sign-in",
  "/world-log-in",
  "/world-login",
  "/world-sign-in",
  "/world-signin",
  "/worldid-auth",
  "/worldid-login",
  "/worldid-sign-in",
  "/world-id",
  "/worldid",
  "/world-wallet-auth",
  "/x-auth",
  "/x-login",
  "/x-oauth",
] as const;

const LEGACY_BROWSER_AUTH_COOKIE_PATHS = [
  "/",
  "/api",
  "/api/auth",
  "/api/authenticate",
  "/api/authorize",
  "/api/log_in",
  "/api/login",
  "/api/sign-in",
  "/api/world-auth",
  "/api/world/wallet-auth",
  "/api/world/sign-in",
  "/auth",
  "/authenticate",
  "/authorize",
  "/log_in",
  "/login",
  "/sign-in",
  "/wallet-auth",
  "/world-auth",
  "/world/sign-in",
  "/world/wallet-auth",
  "/proof-session",
  "/api/proof-session",
  "/login-with-x",
  "/api/x-login",
  "/world/world-sign-in",
  "/api/world/world-id-auth",
  "/world-miniapp/oauth-callback",
  "/api/world-miniapp/connect-wallet",
] as const;

const LEGACY_AUTH_STORAGE_KEYS = new Set([
  "next-auth.callback-url",
  "next-auth.csrf-token",
  "authjs.callback-url",
  "authjs.csrf-token",
  "wagmi.connected",
  "wagmi.injected.shimDisconnect",
  "wagmi.recentConnectorId",
  "wagmi.store",
]);

const LEGACY_AUTH_STORAGE_PATTERNS = [
  /^next-auth[.:_-]/i,
  /^authjs[.:_-]/i,
  /^wagmi[.:_-]/i,
  /^walletconnect/i,
  /^wc@/i,
  /wallet-auth/i,
  /world[_-]?wallet[_-]?auth/i,
  /idkit/i,
  /connectoruri/i,
  /siwe/i,
  /twitter[_-]?auth/i,
  /x[_-]?auth/i,
];

export function purgeLegacyBrowserAuthState(): void {
  if (typeof window === "undefined") return;

  try {
    purgeStorage(window.localStorage);
  } catch {
    // Some embedded browsers can deny storage access during startup.
  }

  try {
    purgeStorage(window.sessionStorage);
  } catch {
    // Some embedded browsers can deny storage access during startup.
  }

  try {
    purgeClientCookies(window.document);
  } catch {
    // Best-effort fallback for WebViews that ignore Clear-Site-Data.
  }

  void purgeLegacyBrowserRuntimeCaches(window);
}

export async function purgeLegacyBrowserRuntimeCaches(nativeWindow: Window): Promise<void> {
  await Promise.all([
    purgeCacheStorage(nativeWindow),
    unregisterServiceWorkers(nativeWindow.navigator),
  ]);
}

function purgeStorage(storage: Storage | undefined): void {
  if (!storage) return;

  for (const key of Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(isString)) {
    if (isLegacyAuthStorageKey(key)) {
      storage.removeItem(key);
    }
  }
}

function isLegacyAuthStorageKey(key: string): boolean {
  return LEGACY_AUTH_STORAGE_KEYS.has(key) || LEGACY_AUTH_STORAGE_PATTERNS.some((pattern) => pattern.test(key));
}

function purgeClientCookies(document: Document): void {
  for (const cookieName of LEGACY_AUTH_COOKIE_NAMES) {
    for (const path of LEGACY_BROWSER_AUTH_COOKIE_PATHS) {
      document.cookie = `${cookieName}=; Path=${path}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; SameSite=Lax`;
      document.cookie = `${cookieName}=; Path=${path}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; SameSite=Lax; Secure`;
      document.cookie = `${cookieName}=; Path=${path}; Max-Age=-1`;
    }
  }
}

async function purgeCacheStorage(nativeWindow: Window): Promise<void> {
  const cacheStorage = nativeWindow.caches;
  if (!cacheStorage) return;

  try {
    const cacheNames = await cacheStorage.keys();
    await Promise.all(cacheNames.map((cacheName) => cacheStorage.delete(cacheName).catch(() => false)));
  } catch {
    // CacheStorage can be unavailable or denied in embedded WebViews.
  }
}

async function unregisterServiceWorkers(navigator: Navigator): Promise<void> {
  const serviceWorker = navigator.serviceWorker;
  if (!serviceWorker?.getRegistrations) return;

  try {
    const registrations = await serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));
  } catch {
    // Some WebViews expose partial service worker APIs; stale state cleanup remains best-effort.
  }
}

function isString(value: string | null): value is string {
  return typeof value === "string";
}
