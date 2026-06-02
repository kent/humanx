import { NextResponse, type NextRequest } from "next/server";

import { LEGACY_AUTH_COOKIE_NAMES, LEGACY_AUTH_COOKIE_PATHS } from "@/lib/legacy-auth-state";
import { isLegacyAuthTriggerQueryKey } from "@/lib/redacted-launch-query";

const LEGACY_COMBINED_AUTH_ALIAS_SEGMENT =
  "(?:auth-callback|auth_callback|connect-wallet|connect_wallet|log-in-with-x|log_in_with_x|login-with-x|login_with_x|oauth-callback|oauth_callback|sign-in-with-x|sign_in_with_x|signin-with-x|signin_with_x|twitter-auth|twitter_auth|twitter-login|twitter_login|twitter-oauth|twitter_oauth|wallet_auth|world-auth|world_auth|world-id-auth|world_id_auth|world-id-login|world_id_login|world-id-sign-in|world_id_sign_in|world-log-in|world_log_in|world-login|world_login|world-sign-in|world_sign_in|world-signin|world_signin|world-wallet-auth|world_wallet_auth|worldid-auth|worldid_auth|worldid-login|worldid_login|worldid-sign-in|worldid_sign_in|x-auth|x_auth|x-login|x_login|x-oauth|x_oauth)";
const LEGACY_AUTH_ENTRYPOINTS = [
  /^\/(?:mini-app|miniapp|world|world-app|world-miniapp)\/?$/,
  new RegExp(`^/(?:api/)?${LEGACY_COMBINED_AUTH_ALIAS_SEGMENT}(?:/|$)`),
  new RegExp(`^/(?:api/)?(?:world|world-miniapp)/${LEGACY_COMBINED_AUTH_ALIAS_SEGMENT}(?:/|$)`),
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
const LEGACY_MINIAPP_SHELL_ENTRYPOINTS = [
  /^\/(?:mini-app|miniapp|world|world-app|world-miniapp)\/?$/,
];
const LEGACY_EXTERNAL_HANDOFF_QUERY_KEYS = [
  "path",
  "pathname",
  "next",
  "url",
  "to",
  "target",
  "destination",
  "destinationUrl",
  "goto",
  "state",
  "continue",
  "continueUrl",
  "continue_url",
] as const;
const LEGACY_AUTH_RETURN_QUERY_KEYS = [
  "callback",
  "callbackUrl",
  "callback_url",
  "redirect",
  "redirect_uri",
  "redirectUri",
  "redirectUrl",
  "redirect_url",
  "redirectTo",
  "redirect_to",
  ["return", "to"].join("_"),
  "returnTo",
  "returnUrl",
  "return_url",
] as const;
const LEGACY_ROOT_QUERY_KEYS = [
  ...LEGACY_EXTERNAL_HANDOFF_QUERY_KEYS,
  ...LEGACY_AUTH_RETURN_QUERY_KEYS,
] as const;
const IN_APP_NAVIGATION_CSP =
  "navigate-to 'self' https://x.com/intent/tweet https://twitter.com/intent/tweet mailto:; form-action 'self'";
const LEGACY_RECOVERY_CSP = "navigate-to 'self'; form-action 'none'";
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "Clear-Site-Data": '"cache", "cookies", "storage"',
  "Content-Security-Policy": IN_APP_NAVIGATION_CSP,
  "X-VeriPost-Flow": "world-miniapp-idkit-native-2026-06-01",
  "X-VeriPost-Legacy-Auth-Blocked": "true",
};

type LegacyEntrypointLogMetadata = {
  source: "path" | "query";
  queryKeys?: string[];
};

export function proxy(request: NextRequest) {
  const response =
    legacyMiniAppShellEntrypointResponse(request) ??
    legacyAuthEntrypointResponse(request) ??
    legacyRootQueryEntrypointResponse(request) ??
    NextResponse.next();

  for (const cookieName of LEGACY_AUTH_COOKIE_NAMES) {
    if (!request.cookies.has(cookieName)) continue;

    for (const path of getLegacyCookiePaths(cookieName)) {
      response.headers.append("Set-Cookie", serializeLegacyCookieExpiration(cookieName, path));
    }
  }

  return response;
}

function legacyRootQueryEntrypointResponse(request: NextRequest): NextResponse | null {
  if (request.nextUrl.pathname !== "/") return null;

  const legacyQueryEntrypoint = getLegacyQueryEntrypoint(request.nextUrl);
  if (!legacyQueryEntrypoint) return null;

  const logMetadata = {
    source: "query" as const,
    queryKeys: getPresentLegacyQueryKeys(request.nextUrl),
  };

  if (legacyQueryEntrypoint === "miniapp") {
    logLegacyMiniAppShellEntrypointBlocked(request, logMetadata);
  } else {
    logLegacyAuthEntrypointBlocked(request, logMetadata);
  }

  if (isDocumentNavigation(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    const response = recoverDocumentNavigationToRoot(request, url);
    response.headers.set("X-VeriPost-Legacy-Entrypoint-Source", "query");
    if (legacyQueryEntrypoint === "miniapp") {
      response.headers.set("X-VeriPost-Legacy-Miniapp-Shell-Rewritten", "true");
    }
    applyNoStoreHeaders(response);
    return response;
  }

  const response = NextResponse.json(
    {
      error: {
        code: legacyQueryEntrypoint === "miniapp" ? "legacy_miniapp_shell_removed" : "legacy_auth_removed",
        message: legacyQueryEntrypoint === "miniapp"
          ? "This mini app entry path has moved. Reopen VeriPost from the World App mini app listing."
          : "This stale sign-in route has been removed. Reopen VeriPost inside World App to use your logged-in account.",
      },
    },
    { status: 410 },
  );
  if (legacyQueryEntrypoint === "miniapp") {
    response.headers.set("X-VeriPost-Legacy-Miniapp-Shell-Rewritten", "true");
  }
  response.headers.set("X-VeriPost-Legacy-Entrypoint-Source", "query");
  applyNoStoreHeaders(response);
  return response;
}

function legacyMiniAppShellEntrypointResponse(request: NextRequest): NextResponse | null {
  if (!isLegacyMiniAppShellEntrypoint(request.nextUrl.pathname)) return null;

  logLegacyMiniAppShellEntrypointBlocked(request, { source: "path" });

  if (isDocumentNavigation(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    const response = recoverDocumentNavigationToRoot(request, url);
    response.headers.set("X-VeriPost-Legacy-Miniapp-Shell-Rewritten", "true");
    applyNoStoreHeaders(response);
    return response;
  }

  const response = NextResponse.json(
    {
      error: {
        code: "legacy_miniapp_shell_removed",
        message: "This mini app entry path has moved. Reopen VeriPost from the World App mini app listing.",
      },
    },
    { status: 410 },
  );
  response.headers.set("X-VeriPost-Legacy-Miniapp-Shell-Rewritten", "true");
  applyNoStoreHeaders(response);
  return response;
}

function legacyAuthEntrypointResponse(request: NextRequest): NextResponse | null {
  if (!isLegacyAuthEntrypoint(request.nextUrl.pathname)) return null;

  logLegacyAuthEntrypointBlocked(request, { source: "path" });

  if (isDocumentNavigation(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    const response = recoverDocumentNavigationToRoot(request, url);
    applyNoStoreHeaders(response);
    return response;
  }

  const response = NextResponse.json(
    {
      error: {
        code: "legacy_auth_removed",
        message: "This stale sign-in route has been removed. Reopen VeriPost inside World App to use your logged-in account.",
      },
    },
    { status: 410 },
  );
  applyNoStoreHeaders(response);
  return response;
}

function recoverDocumentNavigationToRoot(request: NextRequest, url: URL): NextResponse {
  if (shouldRecoverDocumentNavigationWithFetchedAppShell(request)) {
    return legacyDocumentFetchedAppShellRecoveryResponse(url, request.method === "HEAD");
  }

  return legacyDocumentRecoveryResponse(url, request.method === "HEAD");
}

function shouldRecoverDocumentNavigationWithFetchedAppShell(request: NextRequest): boolean {
  return (
    request.method === "GET" ||
    request.method === "HEAD" ||
    request.method === "POST"
  ) && isWorldAppUserAgent(request);
}

function legacyDocumentRecoveryResponse(url: URL, headOnly = false): NextResponse {
  const target = `${url.pathname}${url.search}`;
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": LEGACY_RECOVERY_CSP,
    "X-VeriPost-Legacy-Recovery": "static",
  };
  if (headOnly) {
    return new NextResponse(null, {
      status: 200,
      headers,
    });
  }

  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VeriPost</title></head><body><main><p>Returning to VeriPost inside World App. VeriPost uses your logged-in World App account in the mini app.</p><p><a href="${target}">Continue to VeriPost</a></p></main></body></html>`,
    {
      status: 200,
      headers,
    },
  );
}

function legacyDocumentFetchedAppShellRecoveryResponse(url: URL, headOnly = false): NextResponse {
  const target = `${url.pathname}${url.search}`;
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": LEGACY_RECOVERY_CSP,
    "X-VeriPost-Legacy-Recovery": "static-fetch",
  };
  if (headOnly) {
    return new NextResponse(null, {
      status: 200,
      headers,
    });
  }

  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VeriPost</title><script>(()=>{const target=${JSON.stringify(target)};try{window.history.replaceState(window.history.state,"",target);}catch{}fetch(target,{credentials:"same-origin",cache:"no-store"}).then((response)=>{if(!response.ok)throw new Error("recovery_fetch_failed");return response.text();}).then((html)=>{document.open();document.write(html);document.close();}).catch(()=>{document.documentElement.dataset.veripostRecovery="manual";});})();</script></head><body><main><p>Returning to VeriPost inside World App. VeriPost uses your logged-in World App account in the mini app.</p><p><a href="${escapeHtmlAttribute(target)}">Continue to VeriPost</a></p></main></body></html>`,
    {
      status: 200,
      headers,
    },
  );
}

function isLegacyAuthEntrypoint(pathname: string): boolean {
  return LEGACY_AUTH_ENTRYPOINTS.some((pattern) => pattern.test(pathname));
}

function isLegacyMiniAppShellEntrypoint(pathname: string): boolean {
  return LEGACY_MINIAPP_SHELL_ENTRYPOINTS.some((pattern) => pattern.test(pathname));
}

function getLegacyQueryEntrypoint(url: URL): "auth" | "miniapp" | null {
  for (const key of LEGACY_ROOT_QUERY_KEYS) {
    const value = url.searchParams.get(key);
    if (!value) {
      if (url.searchParams.has(key) && isLegacyAuthReturnQueryKey(key)) return "auth";
      continue;
    }

    const parsedUrl = parseEntrypointUrl(value, url);
    if (!parsedUrl) {
      if (isLegacyAuthReturnQueryKey(key)) return "auth";
      continue;
    }

    if (parsedUrl.origin === url.origin) {
      if (isLegacyMiniAppShellEntrypoint(parsedUrl.pathname)) return "miniapp";
      if (isLegacyAuthEntrypoint(parsedUrl.pathname)) return "auth";
    }

    if (isLegacyExternalAuthEntrypoint(parsedUrl)) return "auth";
    if (
      isLegacyExternalHandoffQueryKey(key) &&
      parsedUrl.origin !== url.origin &&
      !isAllowedRootQueryTarget(parsedUrl, url)
    ) {
      return "auth";
    }
    if (isLegacyAuthReturnQueryKey(key) && !isAllowedRootQueryTarget(parsedUrl, url)) return "auth";
  }

  for (const [key, value] of url.searchParams) {
    if (isLegacyRootQueryKey(key)) continue;
    if (isLegacyAuthTriggerQueryKey(key)) return "auth";
    if (!shouldInspectUnknownRootQueryValue(value)) continue;

    const parsedUrl = parseEntrypointUrl(value, url);
    if (!parsedUrl) continue;

    if (parsedUrl.origin === url.origin) {
      if (isLegacyMiniAppShellEntrypoint(parsedUrl.pathname)) return "miniapp";
      if (isLegacyAuthEntrypoint(parsedUrl.pathname)) return "auth";
      continue;
    }

    if (isLegacyExternalAuthEntrypoint(parsedUrl)) return "auth";
    if (!isAllowedRootQueryTarget(parsedUrl, url)) return "auth";
  }

  return null;
}

function getPresentLegacyQueryKeys(url: URL): string[] {
  const keys = LEGACY_ROOT_QUERY_KEYS.filter((key) => url.searchParams.has(key));

  for (const [key, value] of url.searchParams) {
    if (keys.includes(key)) continue;
    if (isLegacyAuthTriggerQueryKey(key)) {
      keys.push(key);
      continue;
    }
    if (!shouldInspectUnknownRootQueryValue(value)) continue;

    const parsedUrl = parseEntrypointUrl(value, url);
    if (!parsedUrl) continue;
    if (parsedUrl.origin === url.origin) {
      if (isLegacyMiniAppShellEntrypoint(parsedUrl.pathname) || isLegacyAuthEntrypoint(parsedUrl.pathname)) {
        keys.push(key);
      }
      continue;
    }
    if (isLegacyExternalAuthEntrypoint(parsedUrl) || !isAllowedRootQueryTarget(parsedUrl, url)) {
      keys.push(key);
    }
  }

  return keys;
}

function parseEntrypointUrl(value: string, baseUrl: URL): URL | null {
  try {
    return new URL(normalizeRootQueryUrlValue(value), baseUrl);
  } catch {
    return null;
  }
}

function isLegacyExternalAuthEntrypoint(url: URL): boolean {
  if (url.protocol === "worldapp:" || url.protocol === "worldcoin:") return true;
  if (url.protocol !== "https:") return false;

  const hostname = url.hostname.toLowerCase();
  if ((hostname === "x.com" || hostname === "twitter.com") && url.pathname !== "/intent/tweet") return true;
  if (hostname === "api.twitter.com") return true;
  if ((hostname === "world.org" || hostname === "worldcoin.org") &&
    (url.pathname.startsWith("/verify") || url.pathname.startsWith("/mini-app"))) return true;
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
  return new RegExp(`^(?:api/)?${LEGACY_COMBINED_AUTH_ALIAS_SEGMENT}(?:/|$)`).test(normalized) ||
    new RegExp(`^(?:api/)?(?:world|world-miniapp)/${LEGACY_COMBINED_AUTH_ALIAS_SEGMENT}(?:/|$)`).test(normalized) ||
    /^(?:api\/)?(?:auth|authenticate|authentication|authorize|authorization|authjs|callback|complete-auth|complete-siwe|complete-wallet-auth|connect|idkit|idkit-rp|log-in|log_in|login|minikit|mini-kit|next-auth|nonce|oauth|oauth2|proof-session|rp|rp-signature|session|sign|sign-in|sign_in|signin|signature|siwe|twitter|twitter-auth|verify|wallet|wallet-auth|world-app|world-auth|world-id|world-miniapp|world-wallet-auth|worldid|x-auth|x-oauth)(?:\/|$)/.test(normalized) ||
    /^(?:api\/)?world\/(?:auth|authenticate|authentication|authorize|authorization|callback|complete-auth|complete-siwe|complete-wallet-auth|connect|idkit|idkit-rp|log-in|log_in|login|minikit|mini-kit|nonce|oauth|oauth2|rp|rp-signature|session|sign|sign-in|sign_in|signature|siwe|verify|wallet|wallet-auth|world-auth|world-id|worldid)(?:\/|$)/.test(normalized);
}

function isAllowedRootQueryTarget(targetUrl: URL, currentUrl: URL): boolean {
  if (targetUrl.origin === currentUrl.origin) {
    return (
      targetUrl.pathname === "/" ||
      targetUrl.pathname.startsWith("/proof/")
    );
  }

  return (
    targetUrl.protocol === "https:" &&
    (targetUrl.hostname === "x.com" || targetUrl.hostname === "twitter.com") &&
    targetUrl.pathname === "/intent/tweet"
  );
}

function isDocumentNavigation(request: NextRequest): boolean {
  const secFetchMode = request.headers.get("sec-fetch-mode");
  const secFetchDest = request.headers.get("sec-fetch-dest");
  const accept = request.headers.get("accept") ?? "";
  const contentType = request.headers.get("content-type") ?? "";
  const acceptsJson = /\bapplication\/(?:[\w.+-]+\+)?json\b/i.test(accept);
  const hasJsonRequestBody = /\bapplication\/(?:[\w.+-]+\+)?json\b/i.test(contentType);
  const isDocumentLikeRead = (
    request.method === "GET" ||
    request.method === "HEAD"
  ) && !acceptsJson && secFetchMode !== "cors";
  const isWorldAppWebViewRequest = !acceptsJson &&
    !hasJsonRequestBody &&
    isWorldAppUserAgent(request) &&
    (
      request.method === "GET" ||
      request.method === "HEAD" ||
      request.method === "POST"
    );
  const isFormPost =
    request.method === "POST" &&
    !acceptsJson &&
    secFetchMode !== "cors" &&
    (contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data"));

  return request.method !== "OPTIONS" && (
    secFetchMode === "navigate" ||
    secFetchDest === "document" ||
    accept.includes("text/html") ||
    isDocumentLikeRead ||
    isWorldAppWebViewRequest ||
    isFormPost
  );
}

function isWorldAppUserAgent(request: NextRequest): boolean {
  return /world ?app|worldcoin/i.test(request.headers.get("user-agent") ?? "");
}

function applyNoStoreHeaders(response: NextResponse): void {
  for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
    if (key.toLowerCase() === "content-security-policy" && response.headers.has(key)) continue;
    response.headers.set(key, value);
  }
}

function logLegacyAuthEntrypointBlocked(
  request: NextRequest,
  metadata: LegacyEntrypointLogMetadata,
): void {
  const userAgent = request.headers.get("user-agent") ?? "";

  console.info(
    "legacy_auth_entrypoint_blocked",
    JSON.stringify({
      receivedAt: new Date().toISOString(),
      request: {
        path: request.nextUrl.pathname,
        method: request.method,
        entrypoint: metadata,
        provenance: {
          secFetchSite: safeFetchHeader(request.headers.get("sec-fetch-site")),
          secFetchMode: safeFetchHeader(request.headers.get("sec-fetch-mode")),
          secFetchDest: safeFetchHeader(request.headers.get("sec-fetch-dest")),
        },
        userAgent: {
          worldApp: /world ?app|worldcoin/i.test(userAgent),
          ios: /iphone|ipad|ipod/i.test(userAgent),
          android: /android/i.test(userAgent),
          mobile: /mobile|iphone|ipad|ipod|android/i.test(userAgent),
        },
      },
    }),
  );
}

function logLegacyMiniAppShellEntrypointBlocked(
  request: NextRequest,
  metadata: LegacyEntrypointLogMetadata,
): void {
  const userAgent = request.headers.get("user-agent") ?? "";

  console.info(
    "legacy_miniapp_shell_entrypoint_blocked",
    JSON.stringify({
      receivedAt: new Date().toISOString(),
      request: {
        path: request.nextUrl.pathname,
        method: request.method,
        entrypoint: metadata,
        provenance: {
          secFetchSite: safeFetchHeader(request.headers.get("sec-fetch-site")),
          secFetchMode: safeFetchHeader(request.headers.get("sec-fetch-mode")),
          secFetchDest: safeFetchHeader(request.headers.get("sec-fetch-dest")),
        },
        userAgent: {
          worldApp: /world ?app|worldcoin/i.test(userAgent),
          ios: /iphone|ipad|ipod/i.test(userAgent),
          android: /android/i.test(userAgent),
          mobile: /mobile|iphone|ipad|ipod|android/i.test(userAgent),
        },
      },
    }),
  );
}

function safeFetchHeader(value: string | null): string | null {
  if (!value || !/^[a-z0-9_-]{1,40}$/i.test(value)) return null;
  return value;
}

function escapeHtmlAttribute(value: string): string {
  return value.replace(/[&"]/g, (character) => character === "&" ? "&amp;" : "&quot;");
}

function serializeLegacyCookieExpiration(cookieName: string, path: string): string {
  const parts = [
    `${cookieName}=`,
    `Path=${path}`,
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
    "SameSite=Lax",
  ];
  if (isSecureCookieName(cookieName)) parts.push("Secure");
  return parts.join("; ");
}

function getLegacyCookiePaths(cookieName: string): string[] {
  return cookieName.startsWith("__Host-") ? ["/"] : [...LEGACY_AUTH_COOKIE_PATHS];
}

function isSecureCookieName(cookieName: string): boolean {
  return cookieName.startsWith("__Host-") || cookieName.startsWith("__Secure-");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|app-icon.png|store-card.png|screenshots).*)"],
};
