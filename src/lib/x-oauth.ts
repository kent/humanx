import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { ApiError } from "@/lib/http";

// X (Twitter) OAuth 2.0 with PKCE. Proves the user CONTROLS an @handle, and —
// with tweet.write — lets VeriPost post the tweet on the user's behalf and
// capture the tweet id automatically (no copy/paste). Optional: when
// X_CLIENT_ID/X_CLIENT_SECRET are unset the flow falls back to oEmbed binding.

const AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.x.com/2/oauth2/token";
const USERS_ME_URL = "https://api.x.com/2/users/me";
const POST_TWEET_URL = "https://api.x.com/2/tweets";
const SCOPES = ["tweet.read", "tweet.write", "users.read"];
const SESSION_TTL_MS = 60 * 60 * 1000;
const FLOW_TTL_MS = 10 * 60 * 1000;
export const X_SESSION_COOKIE = "vp_x_session";
export const X_FLOW_COOKIE = "vp_x_flow";

export type XOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type VerifiedXAccount = {
  xUserId: string;
  handle: string; // lowercased, no @
  accessToken: string;
};

export function getXOAuthConfig(appUrl: string): XOAuthConfig | null {
  const clientId = process.env.X_CLIENT_ID?.trim();
  const clientSecret = process.env.X_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  const redirectUri = process.env.X_OAUTH_REDIRECT_URI?.trim() || `${appUrl}/api/x-connect/callback`;
  return { clientId, clientSecret, redirectUri };
}

export function isXOAuthConfigured(): boolean {
  return Boolean(process.env.X_CLIENT_ID?.trim() && process.env.X_CLIENT_SECRET?.trim());
}

function getSecret(): string {
  const secret =
    process.env.VERIPOST_BINDING_SECRET?.trim() || process.env.WORLD_ID_RP_SIGNING_KEY?.trim();
  if (!secret) {
    throw new ApiError(503, "configuration_error", "Session signing secret is not configured.");
  }
  return secret;
}

function key32(): Buffer {
  return createHash("sha256").update(getSecret()).digest();
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(body: string): string {
  return createHmac("sha256", getSecret()).update(body).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const aB = Buffer.from(a);
  const bB = Buffer.from(b);
  return aB.length === bB.length && timingSafeEqual(aB, bB);
}

// Authenticated encryption for the access token at rest in the cookie.
function encryptToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key32(), iv);
  const enc = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${enc.toString("base64url")}.${tag.toString("base64url")}`;
}

function decryptToken(value: string): string | null {
  const [ivB, encB, tagB] = value.split(".");
  if (!ivB || !encB || !tagB) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key32(), Buffer.from(ivB, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encB, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// --- PKCE + signed flow state ---

export type XFlowState = { state: string; codeVerifier: string; returnTo: string };

export function createXFlow(returnTo: string, now: number = Date.now()): {
  flow: XFlowState;
  authorizeUrl: (config: XOAuthConfig) => string;
  cookieValue: string;
} {
  const state = base64url(randomBytes(24));
  const codeVerifier = base64url(randomBytes(48));
  const flow: XFlowState = { state, codeVerifier, returnTo };
  const body = base64url(JSON.stringify({ ...flow, exp: now + FLOW_TTL_MS }));
  return {
    flow,
    cookieValue: `${body}.${sign(body)}`,
    authorizeUrl: (config) => {
      const challenge = base64url(createHash("sha256").update(codeVerifier).digest());
      const url = new URL(AUTHORIZE_URL);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", config.clientId);
      url.searchParams.set("redirect_uri", config.redirectUri);
      url.searchParams.set("scope", SCOPES.join(" "));
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", challenge);
      url.searchParams.set("code_challenge_method", "S256");
      return url.toString();
    },
  };
}

export function parseXFlowCookie(value: string | undefined, now: number = Date.now()): XFlowState {
  if (!value) throw new ApiError(400, "x_flow_missing", "Connect-to-X session expired. Try again.");
  const [body, mac] = value.split(".");
  if (!body || !mac || !safeEqual(mac, sign(body))) {
    throw new ApiError(400, "x_flow_invalid", "Connect-to-X session is invalid.");
  }
  let payload: XFlowState & { exp: number };
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw new ApiError(400, "x_flow_invalid", "Connect-to-X session is unreadable.");
  }
  if (typeof payload.exp !== "number" || payload.exp < now) {
    throw new ApiError(400, "x_flow_expired", "Connect-to-X session expired. Try again.");
  }
  return { state: payload.state, codeVerifier: payload.codeVerifier, returnTo: payload.returnTo };
}

// --- Verified-X session cookie (handle + encrypted access token) ---

export function createXSessionCookie(account: VerifiedXAccount, now: number = Date.now()): string {
  const body = base64url(JSON.stringify({
    xUserId: account.xUserId,
    handle: account.handle,
    tok: encryptToken(account.accessToken),
    exp: now + SESSION_TTL_MS,
  }));
  return `${body}.${sign(body)}`;
}

export function readXSessionCookie(
  value: string | undefined,
  now: number = Date.now(),
): VerifiedXAccount | null {
  if (!value) return null;
  const [body, mac] = value.split(".");
  if (!body || !mac || !safeEqual(mac, sign(body))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      xUserId?: string; handle?: string; tok?: string; exp?: number;
    };
    if (typeof payload.exp !== "number" || payload.exp < now) return null;
    if (!payload.xUserId || !payload.handle || !payload.tok) return null;
    const accessToken = decryptToken(payload.tok);
    if (!accessToken) return null;
    return { xUserId: payload.xUserId, handle: payload.handle.toLowerCase(), accessToken };
  } catch {
    return null;
  }
}

// --- Token exchange + identity + posting (network) ---

export async function exchangeXCodeForAccount(
  config: XOAuthConfig,
  code: string,
  codeVerifier: string,
  fetcher: typeof fetch = fetch,
): Promise<VerifiedXAccount> {
  const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  let tokenResponse: Response;
  try {
    tokenResponse = await fetcher(TOKEN_URL, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: config.redirectUri,
        code_verifier: codeVerifier,
      }).toString(),
    });
  } catch (error) {
    throw new ApiError(502, "x_token_unreachable", "Could not reach X to complete sign-in.", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
  if (!tokenResponse.ok) {
    throw new ApiError(401, "x_token_failed", "X sign-in could not be completed.");
  }
  const token = (await tokenResponse.json().catch(() => null)) as { access_token?: string } | null;
  if (!token?.access_token) {
    throw new ApiError(401, "x_token_failed", "X did not return an access token.");
  }

  let meResponse: Response;
  try {
    meResponse = await fetcher(USERS_ME_URL, {
      headers: { authorization: `Bearer ${token.access_token}` },
    });
  } catch (error) {
    throw new ApiError(502, "x_identity_unreachable", "Could not read your X identity.", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
  if (!meResponse.ok) {
    throw new ApiError(401, "x_identity_failed", "Could not read your X identity.");
  }
  const me = (await meResponse.json().catch(() => null)) as
    | { data?: { id?: string; username?: string } }
    | null;
  if (!me?.data?.id || !me.data.username) {
    throw new ApiError(401, "x_identity_failed", "X did not return your account.");
  }
  return { xUserId: me.data.id, handle: me.data.username.toLowerCase(), accessToken: token.access_token };
}

export type PostedTweet = { tweetId: string };

export async function postTweetAsUser(
  accessToken: string,
  text: string,
  fetcher: typeof fetch = fetch,
): Promise<PostedTweet> {
  let response: Response;
  try {
    response = await fetcher(POST_TWEET_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ text }),
    });
  } catch (error) {
    throw new ApiError(502, "x_post_unreachable", "Could not reach X to publish your post.", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
  if (response.status === 403) {
    throw new ApiError(403, "x_post_forbidden", "X rejected the post. Your X app needs Read and Write access.");
  }
  if (!response.ok) {
    throw new ApiError(502, "x_post_failed", "X could not publish your post. Try again.");
  }
  const payload = (await response.json().catch(() => null)) as { data?: { id?: string } } | null;
  if (!payload?.data?.id || !/^\d{1,25}$/.test(payload.data.id)) {
    throw new ApiError(502, "x_post_failed", "X did not return the published post id.");
  }
  return { tweetId: payload.data.id };
}

export function assertXState(expected: string, received: string | null): void {
  if (!received || !safeEqual(expected, received)) {
    throw new ApiError(400, "x_state_mismatch", "Connect-to-X verification failed. Try again.");
  }
}
