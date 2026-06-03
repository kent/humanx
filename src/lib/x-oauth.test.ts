import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHash } from "node:crypto";

import {
  createXFlow,
  createXSessionCookie,
  exchangeXCodeForAccount,
  getXOAuthConfig,
  parseXFlowState,
  postTweetAsUser,
  readXSessionCookie,
} from "@/lib/x-oauth";

const config = {
  clientId: "test-client",
  clientSecret: "test-secret",
  redirectUri: "https://veripost.io/api/x-connect/callback",
};

beforeEach(() => {
  process.env.VERIPOST_BINDING_SECRET = "test-secret-key";
});
afterEach(() => {
  delete process.env.VERIPOST_BINDING_SECRET;
  delete process.env.X_CLIENT_ID;
  delete process.env.X_CLIENT_SECRET;
});

describe("x-oauth config", () => {
  it("is null unless both client id and secret are set", () => {
    expect(getXOAuthConfig("https://veripost.io")).toBeNull();
    process.env.X_CLIENT_ID = "id";
    process.env.X_CLIENT_SECRET = "secret";
    expect(getXOAuthConfig("https://veripost.io")).toMatchObject({
      clientId: "id",
      redirectUri: "https://veripost.io/api/x-connect/callback",
    });
  });
});

describe("x-oauth PKCE flow (cookieless)", () => {
  it("carries signed state in the URL and recovers a verifier that hashes to the challenge", () => {
    const { authorizeUrl, state, linkCode } = createXFlow("/", "link-code-abcdef0123456789", 1_000);
    expect(linkCode).toBe("link-code-abcdef0123456789");
    const url = new URL(authorizeUrl(config));
    expect(url.origin + url.pathname).toBe("https://x.com/i/oauth2/authorize");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toBe(state);
    expect(url.searchParams.get("client_id")).toBe("test-client");

    // The verifier is recovered from the signed state, and PKCE holds:
    // sha256(verifier) === the challenge sent to X. The verifier is never in the URL.
    const { codeVerifier, linkCode: recovered } = parseXFlowState(state, 1_000);
    const challenge = createHash("sha256").update(codeVerifier).digest("base64url");
    expect(url.searchParams.get("code_challenge")).toBe(challenge);
    expect(url.toString()).not.toContain(codeVerifier);
    expect(recovered).toBe("link-code-abcdef0123456789");
  });

  it("rejects expired, tampered, or missing state", () => {
    const { state } = createXFlow("/", "link-code-abcdef0123456789", 1_000);
    expect(() => parseXFlowState(state, 1_000 + 11 * 60 * 1000)).toThrow("expired");
    const [body] = state.split(".");
    expect(() => parseXFlowState(`${body}.bad`)).toThrow();
    expect(() => parseXFlowState(null)).toThrow();
  });
});

describe("x-oauth verified session", () => {
  it("round-trips a signed session cookie (with encrypted token) and rejects tampering/expiry", () => {
    const cookie = createXSessionCookie({ xUserId: "42", handle: "kentf", accessToken: "secret-token" }, 1_000);
    expect(readXSessionCookie(cookie, 1_000)).toEqual({ xUserId: "42", handle: "kentf", accessToken: "secret-token" });
    // The access token must not appear in plaintext in the cookie.
    expect(cookie).not.toContain("secret-token");
    expect(readXSessionCookie(cookie, 1_000 + 2 * 60 * 60 * 1000)).toBeNull();
    const [body] = cookie.split(".");
    expect(readXSessionCookie(`${body}.bad`)).toBeNull();
  });
});

describe("x-oauth code exchange", () => {
  it("exchanges a code for the verified account via token + users/me", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("oauth2/token")) {
        return new Response(JSON.stringify({ access_token: "tok" }), { status: 200 });
      }
      return new Response(JSON.stringify({ data: { id: "999", username: "KentF" } }), { status: 200 });
    });

    const account = await exchangeXCodeForAccount(config, "code", "verifier", fetcher as typeof fetch);
    expect(account).toEqual({ xUserId: "999", handle: "kentf", accessToken: "tok" });
  });

  it("fails closed when the token endpoint rejects", async () => {
    const fetcher = vi.fn(async () => new Response("nope", { status: 400 }));
    await expect(
      exchangeXCodeForAccount(config, "code", "verifier", fetcher as typeof fetch),
    ).rejects.toThrow("could not be completed");
  });
});

describe("postTweetAsUser", () => {
  it("posts via the X API and returns the tweet id", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ data: { id: "1799999999999999999" } }), { status: 201 }));
    const result = await postTweetAsUser("tok", "hello world", fetcher as typeof fetch);
    expect(result).toEqual({ tweetId: "1799999999999999999" });
    const call = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const init = call[1];
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer tok");
    expect(JSON.parse(String(init.body))).toEqual({ text: "hello world" });
  });

  it("maps a 403 to a Read-and-Write guidance error", async () => {
    const fetcher = vi.fn(async () => new Response("forbidden", { status: 403 }));
    await expect(postTweetAsUser("tok", "hi", fetcher as typeof fetch)).rejects.toThrow("Read and Write");
  });
});
