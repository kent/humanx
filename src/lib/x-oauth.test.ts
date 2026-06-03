import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  assertXState,
  createXFlow,
  createXSessionCookie,
  exchangeXCodeForAccount,
  getXOAuthConfig,
  parseXFlowCookie,
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

describe("x-oauth PKCE flow", () => {
  it("builds an authorize URL with a S256 challenge and round-trips the flow cookie", () => {
    const { authorizeUrl, cookieValue, flow } = createXFlow("/", 1_000);
    const url = new URL(authorizeUrl(config));
    expect(url.origin + url.pathname).toBe("https://twitter.com/i/oauth2/authorize");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toBe(flow.state);
    expect(url.searchParams.get("client_id")).toBe("test-client");

    const parsed = parseXFlowCookie(cookieValue, 1_000);
    expect(parsed.state).toBe(flow.state);
    expect(parsed.codeVerifier).toBe(flow.codeVerifier);
  });

  it("rejects an expired or tampered flow cookie", () => {
    const { cookieValue } = createXFlow("/", 1_000);
    expect(() => parseXFlowCookie(cookieValue, 1_000 + 11 * 60 * 1000)).toThrow("expired");
    const [body] = cookieValue.split(".");
    expect(() => parseXFlowCookie(`${body}.bad`)).toThrow("invalid");
  });

  it("asserts the returned state matches", () => {
    expect(() => assertXState("abc", "abc")).not.toThrow();
    expect(() => assertXState("abc", "xyz")).toThrow("verification failed");
    expect(() => assertXState("abc", null)).toThrow("verification failed");
  });
});

describe("x-oauth verified session", () => {
  it("round-trips a signed session cookie and rejects tampering/expiry", () => {
    const cookie = createXSessionCookie({ xUserId: "42", handle: "kentf" }, 1_000);
    expect(readXSessionCookie(cookie, 1_000)).toEqual({ xUserId: "42", handle: "kentf" });
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
    expect(account).toEqual({ xUserId: "999", handle: "kentf" });
  });

  it("fails closed when the token endpoint rejects", async () => {
    const fetcher = vi.fn(async () => new Response("nope", { status: 400 }));
    await expect(
      exchangeXCodeForAccount(config, "code", "verifier", fetcher as typeof fetch),
    ).rejects.toThrow("could not be completed");
  });
});
