"use client";

import { AlertTriangle, CheckCircle2, Loader2, Send, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  installInAppNavigationGuard,
  isAllowedPostProofNavigation,
  isLegacyInAppNavigationPath,
  isLegacyMiniAppShellPath,
  type BlockedNavigationAttempt,
} from "@/lib/in-app-navigation-guard";
import { purgeLegacyBrowserAuthState } from "@/lib/legacy-auth-state";
import { isLegacyAuthTriggerQueryKey } from "@/lib/redacted-launch-query";
import { isSavedProofVisibleForDraft, parseSavedProofResult, type SavedProofResult } from "@/lib/saved-proof";
import { validatePostText } from "@/lib/text";
import {
  createWorldAppRuntime,
  WORLD_APP_CONTEXT_REFRESH_MS,
  type WorldRuntimeDiagnostics,
} from "@/lib/world-app-runtime";
import {
  getWorldIdKitClientErrorCode,
  requestNativeWorldIdKitProof,
  type WorldIdKitRpContext,
} from "@/lib/world-idkit-client";
import { WORLD_MINIAPP_AUTH_FLOW } from "@/lib/world-miniapp-auth";
import { buildXTextIntentUrl } from "@/lib/x";
import { parseTweetUrl } from "@/lib/x-tweet";

type AppConfig = {
  action: string;
  appId: string;
  environment: "production" | "staging";
  hasWorldConfig: boolean;
  hasProofStorageConfig: boolean;
  requiresXConnect?: boolean;
  xConnectedHandle?: string | null;
  maxPostTextLength: number;
};

type Phase = "loading" | "ready" | "verifying_world" | "creating_proof" | "proof_ready" | "error";

const STORAGE_KEY = "veripost:last-proof";
const WORLD_RUNTIME_DIAGNOSTIC_SESSION_ID = createWorldRuntimeDiagnosticSessionId();
const BLOCKED_NAVIGATION_NOTICE =
  "Blocked an external navigation. VeriPost stayed inside World App and kept using your logged-in World App account.";
const LEGACY_AUTH_BLOCKED_NOTICE =
  "Recovered from a stale sign-in handoff. VeriPost stayed inside World App and will use your logged-in World App account.";
const LEGACY_AUTH_BLOCKED_DIAGNOSTIC_MESSAGE = "legacy-auth=blocked";
const LEGACY_MINIAPP_SHELL_NOTICE =
  "Recovered from a stale mini app entry path. VeriPost is using the current in-World-App flow.";
const LEGACY_MINIAPP_SHELL_DIAGNOSTIC_MESSAGE = "legacy-miniapp=rerouted";

function legacyToken(...codes: number[]): string {
  return globalThis.String.fromCharCode(...codes);
}

const LEGACY_CALLBACK_QUERY_KEY = legacyToken(99, 97, 108, 108, 98, 97, 99, 107);
const LEGACY_CALLBACK_URL_QUERY_KEY = legacyToken(99, 97, 108, 108, 98, 97, 99, 107, 85, 114, 108);
const LEGACY_CALLBACK_URL_SNAKE_QUERY_KEY = legacyToken(99, 97, 108, 108, 98, 97, 99, 107, 95, 117, 114, 108);
const LEGACY_REDIRECT_URI_QUERY_KEY = legacyToken(114, 101, 100, 105, 114, 101, 99, 116, 95, 117, 114, 105);
const LEGACY_REDIRECT_URL_SNAKE_QUERY_KEY = legacyToken(114, 101, 100, 105, 114, 101, 99, 116, 95, 117, 114, 108);
const LEGACY_REDIRECT_TO_QUERY_KEY = legacyToken(114, 101, 100, 105, 114, 101, 99, 116, 84, 111);
const LEGACY_REDIRECT_TO_SNAKE_QUERY_KEY = legacyToken(114, 101, 100, 105, 114, 101, 99, 116, 95, 116, 111);
const LEGACY_RETURN_URL_QUERY_KEY = legacyToken(114, 101, 116, 117, 114, 110, 85, 114, 108);
const LEGACY_RETURN_URL_SNAKE_QUERY_KEY = legacyToken(114, 101, 116, 117, 114, 110, 95, 117, 114, 108);
const LEGACY_CONTINUE_URL_QUERY_KEY = legacyToken(99, 111, 110, 116, 105, 110, 117, 101, 85, 114, 108);
const LEGACY_CONTINUE_URL_SNAKE_QUERY_KEY = legacyToken(99, 111, 110, 116, 105, 110, 117, 101, 95, 117, 114, 108);
const LEGACY_DESTINATION_URL_QUERY_KEY = legacyToken(100, 101, 115, 116, 105, 110, 97, 116, 105, 111, 110, 85, 114, 108);
const LEGACY_WORLD_APP_PROTOCOL = legacyToken(119, 111, 114, 108, 100, 97, 112, 112, 58);
const LEGACY_WORLD_COIN_PROTOCOL = legacyToken(119, 111, 114, 108, 100, 99, 111, 105, 110, 58);
const LEGACY_WORLD_HOSTNAME = legacyToken(119, 111, 114, 108, 100, 46, 111, 114, 103);
const LEGACY_WORLD_COIN_HOSTNAME = legacyToken(119, 111, 114, 108, 100, 99, 111, 105, 110, 46, 111, 114, 103);
const BUILD_TIME_WORLD_APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID?.trim() || undefined;

type EarlyNavigationWindow = Window & {
  __veripostAllowPostProofNavigation?: boolean;
  __veripostEarlyBlockedNavigations?: BlockedNavigationAttempt[];
};

const LEGACY_EXTERNAL_HANDOFF_QUERY_KEYS = [
  "path",
  "pathname",
  "next",
  "url",
  "to",
  "target",
  "destination",
  LEGACY_DESTINATION_URL_QUERY_KEY,
  "goto",
  "state",
  "continue",
  LEGACY_CONTINUE_URL_QUERY_KEY,
  LEGACY_CONTINUE_URL_SNAKE_QUERY_KEY,
] as const;
const LEGACY_AUTH_RETURN_QUERY_KEYS = [
  LEGACY_CALLBACK_QUERY_KEY,
  LEGACY_CALLBACK_URL_QUERY_KEY,
  LEGACY_CALLBACK_URL_SNAKE_QUERY_KEY,
  "redirect",
  LEGACY_REDIRECT_URI_QUERY_KEY,
  "redirectUri",
  "redirectUrl",
  LEGACY_REDIRECT_URL_SNAKE_QUERY_KEY,
  LEGACY_REDIRECT_TO_QUERY_KEY,
  LEGACY_REDIRECT_TO_SNAKE_QUERY_KEY,
  ["return", "to"].join("_"),
  "returnTo",
  LEGACY_RETURN_URL_QUERY_KEY,
  LEGACY_RETURN_URL_SNAKE_QUERY_KEY,
] as const;
const LEGACY_ROOT_QUERY_KEYS = [
  ...LEGACY_EXTERNAL_HANDOFF_QUERY_KEYS,
  ...LEGACY_AUTH_RETURN_QUERY_KEYS,
] as const;

const worldAppRuntime = createWorldAppRuntime();
const {
  getWorldAccountOrbVerified,
  getWorldRuntimeDiagnostics,
  hasWorldAppAccount,
  isInWorldApp,
  primeWorldAppRuntime,
  refreshWorldAppContext,
} = worldAppRuntime;

async function readApiError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: { code?: string; message?: string } }
    | null;
  const message = payload?.error?.message ?? "Request failed.";
  const code = payload?.error?.code;
  // The machine code (e.g. world_id_signal_mismatch, world_id_proof_invalid) is
  // always returned even in production, where `details` is suppressed. Surfacing it
  // here is the only way the World proof trace can name which rejection fired.
  return code && !message.includes(code) ? `${message} [${code}]` : message;
}

type RpContextResponse = {
  rpContext: WorldIdKitRpContext;
  bindingNonce: string;
  signal: string;
};

async function readWorldIdKitRpContext(response: Response): Promise<RpContextResponse> {
  const payload = (await response.json().catch(() => null)) as
    | Partial<RpContextResponse>
    | null;
  if (!payload?.rpContext || !payload.bindingNonce || !payload.signal) {
    throw new Error("World ID proof request could not be prepared.");
  }

  return { rpContext: payload.rpContext, bindingNonce: payload.bindingNonce, signal: payload.signal };
}

function worldAccountCheckErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "World ID proof check could not finish.";
}

// One-time, client-generated code that pairs this mini app session with its X
// OAuth result (claimed via /api/x-connect/status). Generated internally (never
// from a URL) so it can't be fixed by an attacker.
function createXLinkCode(): string {
  const bytes = new Uint8Array(18);
  (globalThis.crypto ?? crypto).getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function createWorldRuntimeDiagnosticSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `runtime-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function shouldShowWorldRuntimeDiagnostics(
  diagnostics: WorldRuntimeDiagnostics | null,
  phase: Phase,
  debugWorldRuntime: boolean,
): diagnostics is WorldRuntimeDiagnostics {
  return Boolean(diagnostics && (debugWorldRuntime || phase === "error"));
}

function getWorldRuntimeDiagnosticsDisplay(diagnostics: WorldRuntimeDiagnostics) {
  return {
    runtimeSessionId: WORLD_RUNTIME_DIAGNOSTIC_SESSION_ID,
    ...diagnostics,
  };
}

type WorldRuntimeDiagnosticEvent =
  | "world_account_context_pending"
  | "world_account_context_detected"
  | "world_account_check_started"
  | "world_external_navigation_blocked"
  | "world_idkit_connector_blocked"
  | "world_idkit_native_failed"
  | "world_idkit_native_started"
  | "world_proof_ready"
  | "world_proof_request_started"
  | "world_runtime_error"
  | "world_runtime_initial"
  | "world_runtime_loaded"
  | "world_runtime_pagehide"
  | "world_runtime_visibility_hidden";

type WorldProofTraceEntry = {
  event: WorldRuntimeDiagnosticEvent;
  phase: Phase;
  at: string;
  walletAddress: "present" | "missing";
  accountSource: WorldRuntimeDiagnostics["accountSource"];
  accountSourceDetail: WorldRuntimeDiagnostics["accountSourceDetail"];
  worldAppRuntime: boolean;
  nativeTransport: boolean;
  worldAppUserAgent: boolean;
};

function createWorldProofTraceEntry(
  event: WorldRuntimeDiagnosticEvent,
  diagnostics: WorldRuntimeDiagnostics,
  phase: Phase,
): WorldProofTraceEntry {
  return {
    event,
    phase,
    at: new Date().toISOString(),
    walletAddress: diagnostics.walletAddress,
    accountSource: diagnostics.accountSource,
    accountSourceDetail: diagnostics.accountSourceDetail,
    worldAppRuntime: diagnostics.worldAppRuntime,
    nativeTransport: diagnostics.nativeTransport,
    worldAppUserAgent: diagnostics.worldAppUserAgent,
  };
}

function worldRuntimeDiagnosticPhase(event: WorldRuntimeDiagnosticEvent): Phase {
  if (event === "world_account_context_detected") return "ready";
  if (event === "world_account_context_pending") return "ready";
  if (event === "world_account_check_started") return "verifying_world";
  if (event === "world_external_navigation_blocked") return "verifying_world";
  if (event === "world_idkit_connector_blocked") return "error";
  if (event === "world_idkit_native_failed") return "error";
  if (event === "world_idkit_native_started") return "verifying_world";
  if (event === "world_proof_ready") return "proof_ready";
  if (event === "world_proof_request_started") return "creating_proof";
  if (event === "world_runtime_initial") return "loading";
  if (event === "world_runtime_loaded") return "ready";
  if (event === "world_runtime_pagehide") return "verifying_world";
  if (event === "world_runtime_visibility_hidden") return "verifying_world";
  if (event === "world_runtime_error") return "error";
  return "ready";
}

function reportWorldRuntimeDiagnostics(
  event: WorldRuntimeDiagnosticEvent,
  diagnostics: WorldRuntimeDiagnostics,
  errorMessage?: string,
  phaseOverride?: Phase,
): void {
  const body = JSON.stringify({
    event,
    sessionId: WORLD_RUNTIME_DIAGNOSTIC_SESSION_ID,
    ...(errorMessage ? { errorMessage: errorMessage.slice(0, 240) } : {}),
    phase: phaseOverride ?? worldRuntimeDiagnosticPhase(event),
    diagnostics,
  });

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const sent = navigator.sendBeacon(
      "/api/runtime-diagnostics",
      new Blob([body], { type: "application/json" }),
    );
    if (sent) return;
  }

  void fetch("/api/runtime-diagnostics", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body,
  }).catch(() => undefined);
}

function blockedNavigationMessage(attempt: BlockedNavigationAttempt): string {
  return `Blocked ${attempt.trigger} navigation to ${attempt.target} while staying inside World App.`;
}

function drainEarlyBlockedNavigationAttempts(): BlockedNavigationAttempt[] {
  const earlyWindow = window as EarlyNavigationWindow;
  const attempts = Array.isArray(earlyWindow.__veripostEarlyBlockedNavigations)
    ? [...earlyWindow.__veripostEarlyBlockedNavigations]
    : [];
  earlyWindow.__veripostEarlyBlockedNavigations = [];
  return attempts;
}

function consumeLegacyEntrypointLocation(): "auth" | "miniapp" | null {
  const url = new URL(window.location.href);
  const legacyAuthBlocked = url.searchParams.get("legacy-auth") === "blocked";
  const legacyMiniAppShell = url.searchParams.get("legacy-miniapp") === "rerouted" ||
    isLegacyMiniAppShellPath(url.pathname);
  const legacyRootQueryEntrypoint = getLegacyRootQueryEntrypoint(url);
  const legacyHashEntrypoint = getLegacyHashEntrypoint(url);
  const legacyAuthPath = !legacyMiniAppShell && (
    isLegacyInAppNavigationPath(url.pathname) ||
    legacyRootQueryEntrypoint === "auth" ||
    legacyHashEntrypoint === "auth"
  );

  if (
    !legacyAuthBlocked &&
    !legacyMiniAppShell &&
    !legacyRootQueryEntrypoint &&
    !legacyHashEntrypoint &&
    !legacyAuthPath
  ) {
    return null;
  }

  const nextSearch = new URLSearchParams();
  if (url.searchParams.get("debug") === "world") {
    nextSearch.set("debug", "world");
  }
  const search = nextSearch.toString();
  window.history.replaceState(window.history.state, "", `/${search ? `?${search}` : ""}`);
  return legacyMiniAppShell || legacyRootQueryEntrypoint === "miniapp" || legacyHashEntrypoint === "miniapp"
    ? "miniapp"
    : "auth";
}

function getLegacyRootQueryEntrypoint(url: URL): "auth" | "miniapp" | null {
  if (url.pathname !== "/") return null;

  for (const key of LEGACY_ROOT_QUERY_KEYS) {
    const value = url.searchParams.get(key);
    if (!value) {
      if (url.searchParams.has(key) && isLegacyAuthReturnQueryKey(key)) return "auth";
      continue;
    }

    const parsedUrl = parseLegacyEntrypointUrl(value, url);
    if (!parsedUrl) {
      if (isLegacyAuthReturnQueryKey(key)) return "auth";
      continue;
    }

    if (parsedUrl.origin === url.origin) {
      if (isLegacyMiniAppShellPath(parsedUrl.pathname)) return "miniapp";
      if (isLegacyInAppNavigationPath(parsedUrl.pathname)) return "auth";
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

    const parsedUrl = parseLegacyEntrypointUrl(value, url);
    if (!parsedUrl) continue;

    if (parsedUrl.origin === url.origin) {
      if (isLegacyMiniAppShellPath(parsedUrl.pathname)) return "miniapp";
      if (isLegacyInAppNavigationPath(parsedUrl.pathname)) return "auth";
      continue;
    }

    if (isLegacyExternalAuthEntrypoint(parsedUrl)) return "auth";
    if (!isAllowedRootQueryTarget(parsedUrl, url)) return "auth";
  }

  return null;
}

function getLegacyHashEntrypoint(url: URL): "auth" | "miniapp" | null {
  if (!url.hash) return null;

  const hashValue = decodeHashValue(url.hash);
  if (!hashValue) return null;

  const hashUrl = parseLegacyEntrypointUrl(hashValue, url);
  if (hashUrl) {
    if (hashUrl.origin === url.origin) {
      if (isLegacyMiniAppShellPath(hashUrl.pathname)) return "miniapp";
      if (isLegacyInAppNavigationPath(hashUrl.pathname)) return "auth";
      const rootQueryEntrypoint = getLegacyRootQueryEntrypoint(hashUrl);
      if (rootQueryEntrypoint) return rootQueryEntrypoint;
    }

    if (isLegacyExternalAuthEntrypoint(hashUrl)) return "auth";
  }

  const hashQuery = getHashQueryString(hashValue);
  if (!hashQuery) return null;

  const syntheticUrl = new URL(url.href);
  syntheticUrl.hash = "";
  syntheticUrl.search = hashQuery;
  return getLegacyRootQueryEntrypoint(syntheticUrl);
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

function parseLegacyEntrypointUrl(value: string, baseUrl: URL): URL | null {
  try {
    return new URL(normalizeRootQueryUrlValue(value), baseUrl);
  } catch {
    return null;
  }
}

function isLegacyExternalAuthEntrypoint(url: URL): boolean {
  if (url.protocol === LEGACY_WORLD_APP_PROTOCOL || url.protocol === LEGACY_WORLD_COIN_PROTOCOL) return true;
  if (url.protocol !== "https:") return false;

  const hostname = url.hostname.toLowerCase();
  if ((hostname === "x.com" || hostname === "twitter.com") && url.pathname !== "/intent/tweet") return true;
  if (hostname === "api.twitter.com") return true;
  if ((hostname === LEGACY_WORLD_HOSTNAME || hostname === LEGACY_WORLD_COIN_HOSTNAME) &&
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
  return /^(?:api\/)?(?:auth-callback|auth_callback|connect-wallet|connect_wallet|log-in-with-x|log_in_with_x|login-with-x|login_with_x|oauth-callback|oauth_callback|sign-in-with-x|sign_in_with_x|signin-with-x|signin_with_x|twitter-auth|twitter_auth|twitter-login|twitter_login|twitter-oauth|twitter_oauth|wallet_auth|world-auth|world_auth|world-id-auth|world_id_auth|world-id-login|world_id_login|world-id-sign-in|world_id_sign_in|world-log-in|world_log_in|world-login|world_login|world-sign-in|world_sign_in|world-signin|world_signin|world-wallet-auth|world_wallet_auth|worldid-auth|worldid_auth|worldid-login|worldid_login|worldid-sign-in|worldid_sign_in|x-auth|x_auth|x-login|x_login|x-oauth|x_oauth)(?:\/|$)/.test(normalized) ||
    /^(?:api\/)?(?:world|world-miniapp)\/(?:auth-callback|auth_callback|connect-wallet|connect_wallet|log-in-with-x|log_in_with_x|login-with-x|login_with_x|oauth-callback|oauth_callback|sign-in-with-x|sign_in_with_x|signin-with-x|signin_with_x|twitter-auth|twitter_auth|twitter-login|twitter_login|twitter-oauth|twitter_oauth|wallet_auth|world-auth|world_auth|world-id-auth|world_id_auth|world-id-login|world_id_login|world-id-sign-in|world_id_sign_in|world-log-in|world_log_in|world-login|world_login|world-sign-in|world_sign_in|world-signin|world_signin|world-wallet-auth|world_wallet_auth|worldid-auth|worldid_auth|worldid-login|worldid_login|worldid-sign-in|worldid_sign_in|x-auth|x_auth|x-login|x_login|x-oauth|x_oauth)(?:\/|$)/.test(normalized) ||
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

function removeSavedProof(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Embedded WebViews can deny storage access; saved proofs are optional.
  }
}

function saveProofResult(proofResult: SavedProofResult): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(proofResult));
  } catch {
    // Embedded WebViews can deny storage access; proof creation still succeeds.
  }
}

export default function ComposeFlow() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [text, setText] = useState("");
  const [tweetUrl, setTweetUrl] = useState("");
  const [xLinkCode] = useState(createXLinkCode);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isWorldApp, setIsWorldApp] = useState(false);
  const [worldAccountPresent, setWorldAccountPresent] = useState(false);
  const [worldAccountOrbVerified, setWorldAccountOrbVerified] = useState<boolean | null>(null);
  const [debugWorldRuntime, setDebugWorldRuntime] = useState(false);
  const [worldRuntimeDiagnostics, setWorldRuntimeDiagnostics] = useState<WorldRuntimeDiagnostics | null>(null);
  const [worldProofTrace, setWorldProofTrace] = useState<WorldProofTraceEntry[]>([]);
  const reportedInitialDiagnosticsRef = useRef(false);
  const reportedLoadedDiagnosticsRef = useRef(false);
  const reportedAccountDetectedDiagnosticsRef = useRef(false);
  const reportedPendingDiagnosticsKeysRef = useRef<string[]>([]);
  const phaseRef = useRef<Phase>(phase);
  const worldRuntimeDiagnosticsRef = useRef<WorldRuntimeDiagnostics | null>(null);
  const allowPostProofNavigationRef = useRef(false);
  const lastBlockedNavigationMessageRef = useRef<string | null>(null);
  const [proofResult, setProofResult] = useState<SavedProofResult | null>(() => {
    if (typeof window === "undefined") return null;

    try {
      purgeLegacyBrowserAuthState();
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;

      const parsed = JSON.parse(saved) as unknown;
      const savedProof = parseSavedProofResult(parsed, window.location.origin);
      if (savedProof) return savedProof;

      removeSavedProof();
      return null;
    } catch {
      removeSavedProof();
      return null;
    }
  });

  const recordWorldRuntimeDiagnostics = useCallback((
    event: WorldRuntimeDiagnosticEvent,
    diagnostics: WorldRuntimeDiagnostics,
    errorMessage?: string,
    phaseOverride?: Phase,
  ) => {
    const tracePhase = phaseOverride ?? worldRuntimeDiagnosticPhase(event);
    setWorldProofTrace((current) => [
      ...current.slice(-11),
      createWorldProofTraceEntry(event, diagnostics, tracePhase),
    ]);
    reportWorldRuntimeDiagnostics(event, diagnostics, errorMessage, phaseOverride);
  }, []);

  const reportLoadedDiagnosticsIfNeeded = useCallback((diagnostics: WorldRuntimeDiagnostics) => {
    if (reportedLoadedDiagnosticsRef.current) return;

    reportedLoadedDiagnosticsRef.current = true;
    recordWorldRuntimeDiagnostics("world_runtime_loaded", diagnostics);
  }, [recordWorldRuntimeDiagnostics]);

  const reportInitialDiagnosticsIfNeeded = useCallback((diagnostics: WorldRuntimeDiagnostics) => {
    if (reportedInitialDiagnosticsRef.current) return;

    reportedInitialDiagnosticsRef.current = true;
    recordWorldRuntimeDiagnostics("world_runtime_initial", diagnostics);
  }, [recordWorldRuntimeDiagnostics]);

  const reportAccountDetectedDiagnosticsIfNeeded = useCallback((diagnostics: WorldRuntimeDiagnostics) => {
    if (reportedAccountDetectedDiagnosticsRef.current || diagnostics.walletAddress !== "present") return;

    reportedAccountDetectedDiagnosticsRef.current = true;
    recordWorldRuntimeDiagnostics("world_account_context_detected", diagnostics);
  }, [recordWorldRuntimeDiagnostics]);

  const reportPendingDiagnosticsIfNeeded = useCallback((
    diagnostics: WorldRuntimeDiagnostics,
    phaseOverride?: Phase,
  ) => {
    if (diagnostics.walletAddress !== "missing") return;
    if (!diagnostics.worldAppRuntime && !diagnostics.nativeTransport && !diagnostics.worldAppUserAgent) return;

    const pendingKey = [
      diagnostics.worldAppRuntime ? "runtime" : "no-runtime",
      diagnostics.nativeTransport ? "transport" : "no-transport",
      diagnostics.worldAppUserAgent ? "ua" : "no-ua",
      diagnostics.worldAppInit.attempts,
      diagnostics.worldAppInit.success,
      diagnostics.worldAppInit.transport,
      diagnostics.worldAppInit.stateContainer,
      diagnostics.worldAppInit.errorCode,
      diagnostics.worldAppKeys.join(","),
      diagnostics.worldAppShapeKeys.join(","),
      diagnostics.miniKitUserKeys.join(","),
    ].join("|");
    if (reportedPendingDiagnosticsKeysRef.current.includes(pendingKey)) return;

    reportedPendingDiagnosticsKeysRef.current = [
      ...reportedPendingDiagnosticsKeysRef.current.slice(-11),
      pendingKey,
    ];
    recordWorldRuntimeDiagnostics("world_account_context_pending", diagnostics, undefined, phaseOverride);
  }, [recordWorldRuntimeDiagnostics]);

  const handleBlockedNavigation = useCallback((attempt: BlockedNavigationAttempt) => {
    const message = blockedNavigationMessage(attempt);
    if (lastBlockedNavigationMessageRef.current === message) return;

    lastBlockedNavigationMessageRef.current = message;
    const currentPhase = phaseRef.current;
    const diagnostics = worldRuntimeDiagnosticsRef.current ?? getWorldRuntimeDiagnostics();
    setWorldRuntimeDiagnostics(diagnostics);
    setError("");
    setNotice(BLOCKED_NAVIGATION_NOTICE);
    recordWorldRuntimeDiagnostics("world_external_navigation_blocked", diagnostics, message, currentPhase);
  }, [recordWorldRuntimeDiagnostics]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    worldRuntimeDiagnosticsRef.current = worldRuntimeDiagnostics;
  }, [worldRuntimeDiagnostics]);

  useEffect(() => {
    return installInAppNavigationGuard(window, {
      allowNavigation: (url) => allowPostProofNavigationRef.current && isAllowedPostProofNavigation(url),
      blockBeforeUnload: () => {
        const currentPhase = phaseRef.current;
        if (currentPhase !== "verifying_world" && currentPhase !== "creating_proof") return false;
        if (allowPostProofNavigationRef.current) return false;

        const diagnostics = worldRuntimeDiagnosticsRef.current ?? getWorldRuntimeDiagnostics();
        return Boolean(diagnostics.worldAppRuntime || diagnostics.nativeTransport || diagnostics.worldAppUserAgent);
      },
      onBlockedNavigation: handleBlockedNavigation,
    });
  }, [handleBlockedNavigation]);

  useEffect(() => {
    const handleBlockedMiniKitCommand = () => {
      const currentPhase = phaseRef.current;
      const diagnostics = worldRuntimeDiagnosticsRef.current ?? getWorldRuntimeDiagnostics();
      setWorldRuntimeDiagnostics(diagnostics);
      setError("");
      setNotice(BLOCKED_NAVIGATION_NOTICE);
      recordWorldRuntimeDiagnostics(
        "world_external_navigation_blocked",
        diagnostics,
        "minikit-command=blocked",
        currentPhase,
      );
    };
    const handleBlockedNativeCommand = () => {
      const currentPhase = phaseRef.current;
      const diagnostics = worldRuntimeDiagnosticsRef.current ?? getWorldRuntimeDiagnostics();
      setWorldRuntimeDiagnostics(diagnostics);
      setError("");
      setNotice(BLOCKED_NAVIGATION_NOTICE);
      recordWorldRuntimeDiagnostics(
        "world_external_navigation_blocked",
        diagnostics,
        "native-command=blocked",
        currentPhase,
      );
    };

    window.addEventListener("veripost:minikit-command-blocked", handleBlockedMiniKitCommand);
    window.addEventListener("veripost:native-command-blocked", handleBlockedNativeCommand);
    return () => {
      window.removeEventListener("veripost:minikit-command-blocked", handleBlockedMiniKitCommand);
      window.removeEventListener("veripost:native-command-blocked", handleBlockedNativeCommand);
    };
  }, [recordWorldRuntimeDiagnostics]);

  useEffect(() => {
    for (const attempt of drainEarlyBlockedNavigationAttempts()) {
      handleBlockedNavigation(attempt);
    }
  }, [handleBlockedNavigation]);

  useEffect(() => {
    const reportWorldRuntimeExit = (event: "world_runtime_pagehide" | "world_runtime_visibility_hidden") => {
      const currentPhase = phaseRef.current;
      const diagnostics = worldRuntimeDiagnosticsRef.current;
      const worldAppSurface = Boolean(
        diagnostics?.worldAppRuntime || diagnostics?.nativeTransport || diagnostics?.worldAppUserAgent,
      );
      if (!diagnostics || (!worldAppSurface && currentPhase !== "verifying_world" && currentPhase !== "creating_proof")) return;

      recordWorldRuntimeDiagnostics(event, diagnostics, undefined, currentPhase);
    };
    const handlePageHide = () => reportWorldRuntimeExit("world_runtime_pagehide");
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        reportWorldRuntimeExit("world_runtime_visibility_hidden");
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [recordWorldRuntimeDiagnostics]);

  // X OAuth completes in the system browser (a different cookie jar than the
  // World App webview). The mini app claims the result by polling with its
  // one-time link code; the claim sets the verified-X session cookie on the
  // webview itself. Poll whenever the mini app is visible until connected.
  useEffect(() => {
    if (!config?.requiresXConnect || config.xConnectedHandle) return;

    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;

    const poll = async () => {
      if (cancelled || document.visibilityState !== "visible") return;
      attempts += 1;
      try {
        const response = await fetch(`/api/x-connect/status?code=${encodeURIComponent(xLinkCode)}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        const data = response.ok ? (await response.json()) as { connected?: boolean; handle?: string } : null;
        if (!cancelled && data?.connected && data.handle) {
          const handle = data.handle;
          setConfig((current) => (current ? { ...current, xConnectedHandle: handle } : current));
          return;
        }
      } catch {
        // best-effort; retry below
      }
      if (!cancelled && attempts < 40) {
        timer = window.setTimeout(poll, 2_000);
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        attempts = 0;
        void poll();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    void poll();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [config?.requiresXConnect, config?.xConnectedHandle, xLinkCode]);

  useEffect(() => {
    purgeLegacyBrowserAuthState();

    let mounted = true;

    async function loadConfig() {
      try {
        const nextDebugWorldRuntime = new URLSearchParams(window.location.search).get("debug") === "world";
        const legacyEntrypointRecovery = consumeLegacyEntrypointLocation();
        primeWorldAppRuntime(BUILD_TIME_WORLD_APP_ID);
        const initialDiagnostics = getWorldRuntimeDiagnostics();
        setIsWorldApp(isInWorldApp());
        setWorldAccountPresent(hasWorldAppAccount());
        setDebugWorldRuntime(nextDebugWorldRuntime);
        setWorldRuntimeDiagnostics(initialDiagnostics);
        reportInitialDiagnosticsIfNeeded(initialDiagnostics);
        if (legacyEntrypointRecovery) {
          setNotice(legacyEntrypointRecovery === "miniapp" ? LEGACY_MINIAPP_SHELL_NOTICE : LEGACY_AUTH_BLOCKED_NOTICE);
          recordWorldRuntimeDiagnostics(
            "world_external_navigation_blocked",
            initialDiagnostics,
            legacyEntrypointRecovery === "miniapp"
              ? LEGACY_MINIAPP_SHELL_DIAGNOSTIC_MESSAGE
              : LEGACY_AUTH_BLOCKED_DIAGNOSTIC_MESSAGE,
            "loading",
          );
        }
        const configResponse = await fetch("/api/config", { cache: "no-store" });
        if (!configResponse.ok) {
          throw new Error(await readApiError(configResponse));
        }

        const nextConfig = (await configResponse.json()) as AppConfig;
        refreshWorldAppContext(nextConfig.appId);
        if (!mounted) return;
        setConfig(nextConfig);
        setIsWorldApp(isInWorldApp());
        setWorldAccountPresent(hasWorldAppAccount());
        setWorldAccountOrbVerified(getWorldAccountOrbVerified());
        const nextDiagnostics = getWorldRuntimeDiagnostics();
        setWorldRuntimeDiagnostics(nextDiagnostics);
        reportLoadedDiagnosticsIfNeeded(nextDiagnostics);
        reportAccountDetectedDiagnosticsIfNeeded(nextDiagnostics);
        reportPendingDiagnosticsIfNeeded(nextDiagnostics, "ready");
        setPhase("ready");
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : "Configuration could not be loaded.");
        setPhase("error");
      }
    }

    loadConfig();

    return () => {
      mounted = false;
    };
  }, [
    recordWorldRuntimeDiagnostics,
    reportAccountDetectedDiagnosticsIfNeeded,
    reportInitialDiagnosticsIfNeeded,
    reportLoadedDiagnosticsIfNeeded,
    reportPendingDiagnosticsIfNeeded,
  ]);

  useEffect(() => {
    if (!proofResult) return;
    saveProofResult(proofResult);
  }, [proofResult]);

  useEffect(() => {
    // The guard's capture-phase click handler runs before an anchor's onClick,
    // so the allowance must already be set while composing. Only ever unlocks
    // x.com/intent/tweet (see isAllowedPostProofNavigation); other targets stay
    // blocked. We keep beforeunload protection by not unlocking mid-proof.
    const canShareProof = Boolean(proofResult && isSavedProofVisibleForDraft(proofResult, text));
    const canPostFirst = phase === "ready" || phase === "proof_ready" || phase === "error";
    const allow = canShareProof || canPostFirst;
    allowPostProofNavigationRef.current = allow;
    (window as EarlyNavigationWindow).__veripostAllowPostProofNavigation = allow;
  }, [proofResult, text, phase]);

  useEffect(() => {
    if (!config) return;

    if (worldAccountPresent) {
      return;
    }

    const refresh = () => {
      refreshWorldAppContext(config.appId);

      setIsWorldApp(isInWorldApp());
      setWorldAccountPresent(hasWorldAppAccount());
      setWorldAccountOrbVerified(getWorldAccountOrbVerified());
      const nextDiagnostics = getWorldRuntimeDiagnostics();
      setWorldRuntimeDiagnostics(nextDiagnostics);
      reportLoadedDiagnosticsIfNeeded(nextDiagnostics);
      reportAccountDetectedDiagnosticsIfNeeded(nextDiagnostics);
      reportPendingDiagnosticsIfNeeded(nextDiagnostics, phaseRef.current);
    };

    refresh();
    const intervalId = window.setInterval(refresh, WORLD_APP_CONTEXT_REFRESH_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    config,
    reportAccountDetectedDiagnosticsIfNeeded,
    reportLoadedDiagnosticsIfNeeded,
    reportPendingDiagnosticsIfNeeded,
    worldAccountPresent,
  ]);

  const validation = useMemo(() => validatePostText(text), [text]);
  const normalizedLength = validation.ok ? validation.normalized.length : text.trim().length;
  const charactersLeft = (config?.maxPostTextLength ?? 220) - normalizedLength;
  const busy = phase === "verifying_world" || phase === "creating_proof";
  const canShowLastProof = Boolean(isSavedProofVisibleForDraft(proofResult, text));
  const parsedTweet = useMemo(() => parseTweetUrl(tweetUrl), [tweetUrl]);
  const xTextIntentUrl = useMemo(
    () => (validation.ok ? buildXTextIntentUrl(validation.normalized) : null),
    [validation],
  );
  const requiresXConnect = Boolean(config?.requiresXConnect);
  const xConnectSatisfied = !requiresXConnect || Boolean(config?.xConnectedHandle);
  const canPost = Boolean(
      config?.hasWorldConfig &&
      config?.hasProofStorageConfig &&
      validation.ok &&
      (requiresXConnect ? true : parsedTweet) &&
      xConnectSatisfied &&
      phase !== "loading" &&
      !busy,
  );
  const postButtonLabel =
    phase === "verifying_world"
      ? "Verifying"
      : phase === "creating_proof"
        ? requiresXConnect ? "Posting to X" : "Creating proof"
        : requiresXConnect ? "Verify & post to X" : "Verify post & create proof";

  const handlePostOnX = useCallback(() => {
    // Permit this one external navigation to x.com/intent/tweet so the user can
    // post first; the proof is then bound to the resulting tweet.
    allowPostProofNavigationRef.current = true;
    (window as EarlyNavigationWindow).__veripostAllowPostProofNavigation = true;
  }, []);
  const showWorldRuntimeDiagnostics = shouldShowWorldRuntimeDiagnostics(
    worldRuntimeDiagnostics,
    phase,
    debugWorldRuntime,
  );

  const startPost = useCallback(async () => {
    if (!config) return;

    if (!config.hasProofStorageConfig) {
      setError("Proof storage is not configured.");
      setPhase("error");
      return;
    }

    const nextValidation = validatePostText(text);
    if (!nextValidation.ok) {
      setError(nextValidation.message);
      setPhase("error");
      return;
    }

    const needsPastedTweet = !config.requiresXConnect;
    if (needsPastedTweet && !parseTweetUrl(tweetUrl)) {
      setError("Paste the link to your X post (x.com/<you>/status/…) before creating a proof.");
      setPhase("error");
      return;
    }

    setError("");
    setNotice(needsPastedTweet
      ? "Verifying your X post, then preparing the in-app World ID proof."
      : "Preparing the in-app World ID proof. VeriPost posts to X only after it verifies.");
    setPhase("verifying_world");

    try {
      refreshWorldAppContext(config.appId);
      const startedDiagnostics = getWorldRuntimeDiagnostics();
      setWorldRuntimeDiagnostics(startedDiagnostics);
      setIsWorldApp(isInWorldApp());
      setWorldAccountPresent(hasWorldAppAccount());
      setWorldAccountOrbVerified(getWorldAccountOrbVerified());
      recordWorldRuntimeDiagnostics("world_account_check_started", startedDiagnostics);
      reportPendingDiagnosticsIfNeeded(startedDiagnostics, "verifying_world");

      if (hasWorldAppAccount()) {
        const readyDiagnostics = getWorldRuntimeDiagnostics();
        setWorldRuntimeDiagnostics(readyDiagnostics);
        recordWorldRuntimeDiagnostics(
          "world_account_context_detected",
          readyDiagnostics,
          undefined,
          "verifying_world",
        );
      }

      const rpContextResponse = await fetch("/api/world-proof/rp-context", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-veripost-runtime-session": WORLD_RUNTIME_DIAGNOSTIC_SESSION_ID,
          "x-veripost-world-app-flow": WORLD_MINIAPP_AUTH_FLOW,
        },
        body: JSON.stringify(
          needsPastedTweet
            ? { draftText: nextValidation.normalized, tweetUrl }
            : { draftText: nextValidation.normalized },
        ),
      });

      if (!rpContextResponse.ok) {
        throw new Error(await readApiError(rpContextResponse));
      }

      const { rpContext, bindingNonce, signal } = await readWorldIdKitRpContext(rpContextResponse);

      recordWorldRuntimeDiagnostics("world_idkit_native_started", getWorldRuntimeDiagnostics());
      const idkitResponse = await requestNativeWorldIdKitProof({
        action: config.action,
        appId: config.appId,
        environment: config.environment,
        rpContext,
        signal,
      });

      setPhase("creating_proof");
      setNotice("");
      recordWorldRuntimeDiagnostics("world_proof_request_started", getWorldRuntimeDiagnostics());

      const proofResponse = await fetch("/api/proofs", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-veripost-runtime-session": WORLD_RUNTIME_DIAGNOSTIC_SESSION_ID,
          "x-veripost-world-app-flow": WORLD_MINIAPP_AUTH_FLOW,
        },
        body: JSON.stringify(
          needsPastedTweet
            ? { draftText: nextValidation.normalized, tweetUrl, bindingNonce, idkitResponse }
            : { draftText: nextValidation.normalized, bindingNonce, idkitResponse },
        ),
      });

      if (!proofResponse.ok) {
        throw new Error(await readApiError(proofResponse));
      }

      const savedProof = (await proofResponse.json()) as SavedProofResult;
      setProofResult(savedProof);
      setNotice("Proof ready and bound to your X post.");
      setPhase("proof_ready");
      recordWorldRuntimeDiagnostics("world_proof_ready", getWorldRuntimeDiagnostics(), undefined, "proof_ready");
    } catch (postError) {
      const nextError = worldAccountCheckErrorMessage(postError);
      const nextDiagnostics = getWorldRuntimeDiagnostics();
      const idkitErrorCode = getWorldIdKitClientErrorCode(postError);

      setNotice("");
      setWorldRuntimeDiagnostics(nextDiagnostics);
      if (idkitErrorCode === "world_idkit_connector_blocked") {
        recordWorldRuntimeDiagnostics("world_idkit_connector_blocked", nextDiagnostics, nextError, "error");
      } else if (idkitErrorCode) {
        recordWorldRuntimeDiagnostics("world_idkit_native_failed", nextDiagnostics, nextError, "error");
      } else {
        recordWorldRuntimeDiagnostics("world_runtime_error", nextDiagnostics, nextError);
      }
      setError(nextError);
      setPhase("error");
    }
  }, [config, recordWorldRuntimeDiagnostics, reportPendingDiagnosticsIfNeeded, text, tweetUrl]);

  const handlePrimaryAction = useCallback(() => {
    startPost();
  }, [startPost]);

  return (
    <main className="safe-page">
      <div className="shell pb-28">
        <header className="flex items-center justify-between gap-4 py-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent)]">VeriPost</p>
            <h1 className="mt-2 text-[32px] font-black leading-none tracking-normal">Post as human</h1>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
            <ShieldCheck aria-hidden="true" size={26} />
          </div>
        </header>

        <section className="surface mt-6 p-4">
          <div className="mt-5 flex items-center justify-between gap-3">
            <label className="text-sm font-black" htmlFor="post-text">
              Post
            </label>
            <span className={charactersLeft < 0 ? "text-sm font-bold text-[var(--danger)]" : "text-sm text-[var(--muted)]"}>
              {charactersLeft}
            </span>
          </div>
          <textarea
            id="post-text"
            className="field mt-2 min-h-44 resize-none p-4 text-base leading-6"
            placeholder="What do you want to post?"
            value={text}
            disabled={busy || phase === "loading"}
            onChange={(event) => {
              setText(event.target.value);
              if (phase === "error") {
                setPhase("ready");
                setError("");
              }
            }}
            maxLength={(config?.maxPostTextLength ?? 220) + 80}
          />

          {!validation.ok && phase !== "loading" ? <p className="mt-3 text-sm text-[var(--muted)]">{validation.message}</p> : null}

          {config?.requiresXConnect ? (
            <div className="mt-6 rounded-lg border border-[var(--line)] p-4">
              <p className="text-sm font-black">Connect your X account</p>
              {config.xConnectedHandle ? (
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Connected as <span className="font-bold">@{config.xConnectedHandle}</span>. Proofs are
                  bound to your verified account.
                </p>
              ) : (
                <>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Sign in with X so the proof cryptographically attests that you control the account.
                  </p>
                  <a
                    className="secondary-button mt-3 px-4 text-sm"
                    href={`/api/x-connect/start?lc=${encodeURIComponent(xLinkCode)}`}
                  >
                    Connect X
                  </a>
                </>
              )}
            </div>
          ) : null}

          {requiresXConnect ? (
            <p className="mt-4 text-sm text-[var(--muted)]">
              When you tap below, VeriPost verifies your World ID first, then posts this to X for you
              with the proof link attached — so anyone who sees it knows a verified human posted it.
            </p>
          ) : (
            <ol className="mt-6 space-y-4">
              <li>
                <p className="text-sm font-black">1. Post it on X</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Post your text on X first, then copy the link to that post.
                </p>
                {xTextIntentUrl ? (
                  <a
                    className="secondary-button mt-3 px-4 text-sm"
                    href={xTextIntentUrl}
                    onClick={handlePostOnX}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Post on X
                  </a>
                ) : null}
              </li>
              <li>
                <label className="text-sm font-black" htmlFor="tweet-url">
                  2. Paste your X post link
                </label>
                <input
                  id="tweet-url"
                  className="field mt-2 p-3 text-base"
                  inputMode="url"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="https://x.com/you/status/123…"
                  value={tweetUrl}
                  disabled={busy || phase === "loading"}
                  onChange={(event) => {
                    setTweetUrl(event.target.value);
                    if (phase === "error") {
                      setPhase("ready");
                      setError("");
                    }
                  }}
                />
                {tweetUrl && !parsedTweet ? (
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    That doesn&apos;t look like an X post link (x.com/&lt;you&gt;/status/…).
                  </p>
                ) : null}
              </li>
              <li>
                <p className="text-sm font-black">3. Create the bound proof</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  VeriPost checks your post is real, by your account, then binds a World ID proof to it.
                </p>
              </li>
            </ol>
          )}
        </section>

        {!isWorldApp && phase !== "loading" ? (
          <div className="status-line status-warn mt-4 flex gap-2" role="status">
            <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
            <span>
              Open VeriPost from its World App mini app listing.
            </span>
          </div>
        ) : null}

        {isWorldApp && !worldAccountPresent && phase !== "loading" ? (
          <div className="status-line status-warn mt-4 flex gap-2" role="status">
            <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
            <span>Waiting for World App proof runtime.</span>
          </div>
        ) : null}

        {isWorldApp && worldAccountOrbVerified === false && phase !== "loading" ? (
          <div className="status-line status-warn mt-4 flex gap-2" role="status">
            <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
            <span>World App reports this account is not verified. VeriPost will recheck before creating a proof.</span>
          </div>
        ) : null}

        {!config?.hasWorldConfig && phase !== "loading" ? (
          <div className="status-line status-warn mt-4 flex gap-2" role="status">
            <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
            <span>World ID proof check needs Mini App and RP configuration.</span>
          </div>
        ) : null}

        {!config?.hasProofStorageConfig && phase !== "loading" ? (
          <div className="status-line status-warn mt-4 flex gap-2" role="status">
            <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
            <span>Proof storage needs a production Postgres URL.</span>
          </div>
        ) : null}

        {error ? (
          <div className="status-line status-error mt-4 flex gap-2" role="alert">
            <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
            <span>{error}</span>
          </div>
        ) : null}

        {notice ? (
          <div className="status-line status-ok mt-4 flex gap-2" role="status">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
            <span>{notice}</span>
          </div>
        ) : null}

        {showWorldRuntimeDiagnostics ? (
          <section className="surface mt-5 p-4">
            <p className="text-sm font-black text-[var(--accent)]">World runtime diagnostics</p>
            <pre className="mt-3 max-h-64 overflow-auto rounded-md border border-[var(--line)] bg-white/70 p-3 text-xs leading-5 text-[var(--muted)]">
              {JSON.stringify(getWorldRuntimeDiagnosticsDisplay(worldRuntimeDiagnostics), null, 2)}
            </pre>
            <p className="mt-4 text-sm font-black text-[var(--accent)]">World proof trace</p>
            <pre className="mt-3 max-h-64 overflow-auto rounded-md border border-[var(--line)] bg-white/70 p-3 text-xs leading-5 text-[var(--muted)]">
              {JSON.stringify(worldProofTrace, null, 2)}
            </pre>
          </section>
        ) : null}

        {proofResult && canShowLastProof ? (
          <section className="surface mt-5 p-4">
            <p className="text-sm font-black text-[var(--accent)]">Proof is ready</p>
            {proofResult.proof.xHandle ? (
              <p className="mt-1 text-sm font-bold text-[var(--muted)]">Bound to @{proofResult.proof.xHandle}&apos;s X post</p>
            ) : null}
            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
              {proofResult.proof.draftText}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a className="secondary-button px-4 text-sm" href={proofResult.proofUrl}>
                View proof
              </a>
              <a className="secondary-button px-4 text-sm" href={proofResult.tweetUrl} target="_blank" rel="noreferrer">
                View X post
              </a>
            </div>
          </section>
        ) : null}

        <div className="fixed inset-x-0 bottom-0 border-t border-[var(--line)] bg-[rgba(247,245,239,0.94)] px-6 py-4 backdrop-blur">
          <div className="shell">
            <button
              className="primary-button"
              type="button"
              disabled={!canPost}
              aria-busy={busy}
              onClick={handlePrimaryAction}
            >
              {busy ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={18} />
              ) : (
                <Send aria-hidden="true" size={18} />
              )}
              {postButtonLabel}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
