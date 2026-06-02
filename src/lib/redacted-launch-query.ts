export type PageSearchParamsInput = Record<string, string | string[] | undefined> | URLSearchParams;

export type RedactedLaunchQuery = {
  hasQuery: boolean;
  keyCount: number;
  queryKeys: string[];
  truncated: boolean;
  emptyValueKeys: string[];
  legacyQueryKeys: string[];
  authTriggerKeys: string[];
  authReturnKeys: string[];
  externalHandoffKeys: string[];
  safeRootPathHandoff: boolean;
};

const QUERY_KEY_LIMIT = 24;
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

export function getRedactedLaunchQuery(searchParams: PageSearchParamsInput | undefined): RedactedLaunchQuery {
  const entries = getSearchParamEntries(searchParams);
  const keys = getUniqueKeys(entries.map(([key]) => key));
  const limitedKeys = keys.slice(0, QUERY_KEY_LIMIT);

  return {
    hasQuery: entries.length > 0,
    keyCount: keys.length,
    queryKeys: limitedKeys.map(safeQueryKey),
    truncated: keys.length > QUERY_KEY_LIMIT,
    emptyValueKeys: keys
      .filter((key) => hasOnlyEmptyValues(entries, key))
      .slice(0, QUERY_KEY_LIMIT)
      .map(safeQueryKey),
    legacyQueryKeys: limitedKeys.filter(isLegacyRootQueryKey).map(safeQueryKey),
    authTriggerKeys: limitedKeys.filter(isLegacyAuthTriggerQueryKey).map(safeQueryKey),
    authReturnKeys: limitedKeys.filter(isLegacyAuthReturnQueryKey).map(safeQueryKey),
    externalHandoffKeys: limitedKeys.filter(isLegacyExternalHandoffQueryKey).map(safeQueryKey),
    safeRootPathHandoff: hasSafeRootPathHandoff(entries),
  };
}

export function isLegacyAuthTriggerQueryKey(key: string): boolean {
  const normalized = normalizeQueryKey(key);
  return /^(?:auth|auth-callback|authenticate|authentication|authorize|authorization|connect-wallet|log-in|login|log-in-with-x|login-with-x|sign|signin|sign-in|sign-in-with-x|signin-with-x|wallet|wallet-auth|world-auth|world-id-auth|world-id-login|world-id-sign-in|world-log-in|world-login|world-sign-in|world-signin|world-wallet-auth|miniapp-wallet-auth|minikit|mini-kit|idkit|verify|world-id|worldid|worldid-auth|worldid-login|worldid-sign-in|oauth|oauth2|oauth-callback|siwe|nonce|signature|rp|rp-signature|proof-session|next-auth|authjs|twitter-auth|twitter-login|twitter-oauth|x-auth|x-login|x-oauth)$/.test(normalized);
}

function getSearchParamEntries(searchParams: PageSearchParamsInput | undefined): Array<[string, string]> {
  if (!searchParams) return [];

  if (searchParams instanceof URLSearchParams) {
    return Array.from(searchParams.entries());
  }

  return Object.entries(searchParams).flatMap(([key, value]) => {
    if (Array.isArray(value)) {
      return value.map((item): [string, string] => [key, item]);
    }
    return [[key, value ?? ""]];
  });
}

function getUniqueKeys(keys: string[]): string[] {
  return Array.from(new Set(keys));
}

function hasOnlyEmptyValues(entries: Array<[string, string]>, key: string): boolean {
  const values = entries.filter(([entryKey]) => entryKey === key).map(([, value]) => value);
  return values.length > 0 && values.every((value) => value.trim() === "");
}

function hasSafeRootPathHandoff(entries: Array<[string, string]>): boolean {
  const pathValues = entries.filter(([key]) => key === "path").map(([, value]) => value.trim());
  return pathValues.length > 0 && pathValues.every((value) => value === "/" || value === "");
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

function normalizeQueryKey(key: string): string {
  return key.trim().replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[_\s]+/g, "-").toLowerCase();
}

function safeQueryKey(key: string): string {
  return /^[a-z0-9._:-]{1,80}$/i.test(key) ? key : "invalid";
}
