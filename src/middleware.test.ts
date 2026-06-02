import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LEGACY_AUTH_COOKIE_PATHS } from "@/lib/legacy-auth-state";
import { proxy } from "@/proxy";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("legacy auth cookie proxy", () => {
  it("expires stale HttpOnly auth cookies before route handlers run", () => {
    const response = proxy(
      new NextRequest("https://veripost.io/", {
        headers: {
          cookie: [
            "next-auth.session-token=legacy",
            "__Secure-next-auth.session-token=legacy",
            "__Host-next-auth.csrf-token=legacy",
            "authjs.callback-url=https%3A%2F%2Fx.com",
            "world_wallet_auth_nonce=legacy",
            "veripost-current=keep",
          ].join("; "),
        },
      }),
    );

    const setCookieHeaders = getSetCookieHeaders(response.headers);
    const serializedHeaders = setCookieHeaders.join("\n");

    expect(serializedHeaders).toContain("next-auth.session-token=");
    expect(serializedHeaders).toContain("__Secure-next-auth.session-token=");
    expect(serializedHeaders).toContain("__Host-next-auth.csrf-token=");
    expect(serializedHeaders).toContain("authjs.callback-url=");
    expect(serializedHeaders).toContain("world_wallet_auth_nonce=");
    expect(serializedHeaders).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    expect(serializedHeaders).toContain("Max-Age=0");
    expect(setCookieHeaders.some((header) => header.includes("__Secure-next-auth.session-token=") && header.includes("Secure"))).toBe(
      true,
    );
    const nextAuthSessionCookieHeaders = setCookieHeaders.filter((header) => header.startsWith("next-auth.session-token="));
    expect(nextAuthSessionCookieHeaders).toHaveLength(LEGACY_AUTH_COOKIE_PATHS.length);
    expect(nextAuthSessionCookieHeaders.some((header) => header.includes("Path=/;"))).toBe(
      true,
    );
    expect(nextAuthSessionCookieHeaders.some((header) => header.includes("Path=/api;"))).toBe(true);
    expect(nextAuthSessionCookieHeaders.some((header) => header.includes("Path=/authenticate;"))).toBe(true);
    expect(nextAuthSessionCookieHeaders.some((header) => header.includes("Path=/api/authenticate;"))).toBe(true);
    expect(nextAuthSessionCookieHeaders.some((header) => header.includes("Path=/sign-in;"))).toBe(true);
    expect(nextAuthSessionCookieHeaders.some((header) => header.includes("Path=/api/sign-in;"))).toBe(true);
    expect(nextAuthSessionCookieHeaders.some((header) => header.includes("Path=/log_in;"))).toBe(true);
    expect(nextAuthSessionCookieHeaders.some((header) => header.includes("Path=/login;"))).toBe(true);
    expect(nextAuthSessionCookieHeaders.some((header) => header.includes("Path=/api/login;"))).toBe(true);
    expect(nextAuthSessionCookieHeaders.some((header) => header.includes("Path=/oauth;"))).toBe(true);
    expect(nextAuthSessionCookieHeaders.some((header) => header.includes("Path=/api/oauth;"))).toBe(true);
    expect(nextAuthSessionCookieHeaders.some((header) => header.includes("Path=/world-auth;"))).toBe(true);
    expect(nextAuthSessionCookieHeaders.some((header) => header.includes("Path=/proof-session;"))).toBe(true);
    expect(nextAuthSessionCookieHeaders.some((header) => header.includes("Path=/api/proof-session;"))).toBe(true);
    expect(nextAuthSessionCookieHeaders.some((header) => header.includes("Path=/world/wallet-auth;"))).toBe(true);
    expect(nextAuthSessionCookieHeaders.some((header) => header.includes("Path=/api/world/wallet-auth;"))).toBe(true);
    expect(nextAuthSessionCookieHeaders.some((header) => header.includes("Path=/login-with-x;"))).toBe(true);
    expect(nextAuthSessionCookieHeaders.some((header) => header.includes("Path=/api/x-login;"))).toBe(true);
    expect(nextAuthSessionCookieHeaders.some((header) => header.includes("Path=/world/world-sign-in;"))).toBe(true);
    expect(nextAuthSessionCookieHeaders.some((header) => header.includes("Path=/api/world/world-id-auth;"))).toBe(true);
    expect(setCookieHeaders.filter((header) => header.includes("__Host-next-auth.csrf-token="))).toHaveLength(1);
    expect(setCookieHeaders.some((header) => header.includes("__Host-next-auth.csrf-token=") && header.includes("Path=/;"))).toBe(
      true,
    );
    expect(serializedHeaders).not.toContain("veripost-current");
  });

  it("recovers query-bearing World App stale document auth navigations with a sanitized app-shell loader", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const response = proxy(
      new NextRequest("https://veripost.io/api/auth/signin/twitter?callbackUrl=https%3A%2F%2Fx.com", {
        headers: {
          accept: "text/html",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "user-agent": "WorldApp iPhone",
          cookie: "next-auth.session-token=legacy",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expectWorldAppFetchedRecovery(response, "/");
    expect(response.headers.get("x-veripost-legacy-auth-blocked")).toBe("true");
    expect(response.headers.get("clear-site-data")).toBe('"cache", "cookies", "storage"');
    expect(response.headers.get("content-security-policy")).toBe(
      "navigate-to 'self'; form-action 'none'",
    );
    expect(getSetCookieHeaders(response.headers).join("\n")).toContain("next-auth.session-token=");
    expect(console.info).toHaveBeenCalledWith(
      "legacy_auth_entrypoint_blocked",
      expect.stringContaining('"path":"/api/auth/signin/twitter"'),
    );
    const [, serializedEvent] = vi.mocked(console.info).mock.calls[0] as [string, string];
    expect(serializedEvent).not.toContain("callbackUrl");
    expect(serializedEvent).not.toContain("x.com");
  });

  it("recovers query-bearing World App top-level stale document auth navigations with a sanitized app-shell loader", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const response = proxy(
      new NextRequest("https://veripost.io/login?return_to=https%3A%2F%2Fx.com", {
        headers: {
          accept: "text/html",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "user-agent": "WorldApp iPhone",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expectWorldAppFetchedRecovery(response, "/");
    expect(response.headers.get("x-veripost-legacy-auth-blocked")).toBe("true");
    expect(console.info).toHaveBeenCalledWith(
      "legacy_auth_entrypoint_blocked",
      expect.stringContaining('"path":"/login"'),
    );
    const [, serializedEvent] = vi.mocked(console.info).mock.calls[0] as [string, string];
    expect(serializedEvent).not.toContain("return_to");
    expect(serializedEvent).not.toContain("x.com");
  });

  it("recovers World App stale World verifier handoffs with a sanitized app-shell loader", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const response = proxy(
      new NextRequest("https://veripost.io/?path=https%3A%2F%2Fworldcoin.org%2Fverify%3Fapp_id%3Dsecret", {
        headers: {
          accept: "text/html",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "user-agent": "WorldApp iPhone",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expectWorldAppFetchedRecovery(response, "/");
    expect(response.headers.get("x-veripost-legacy-auth-blocked")).toBe("true");
    expect(response.headers.get("x-veripost-legacy-entrypoint-source")).toBe("query");

    const [, serializedEvent] = vi.mocked(console.info).mock.calls[0] as [string, string];
    expect(serializedEvent).toContain('"queryKeys":["path"]');
    expect(serializedEvent).not.toContain("worldcoin.org");
    expect(serializedEvent).not.toContain("app_id");
  });

  it("recovers World App external root handoff URLs with a sanitized app-shell loader", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const response = proxy(
      new NextRequest("https://veripost.io/?url=https%3A%2F%2Fauth.example.com%2Foauth%3Ftoken%3Dsecret", {
        headers: {
          accept: "text/html",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "user-agent": "WorldApp iPhone",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expectWorldAppFetchedRecovery(response, "/");
    expect(response.headers.get("x-veripost-legacy-auth-blocked")).toBe("true");
    expect(response.headers.get("x-veripost-legacy-entrypoint-source")).toBe("query");

    const [, serializedEvent] = vi.mocked(console.info).mock.calls[0] as [string, string];
    expect(serializedEvent).toContain('"queryKeys":["url"]');
    expect(serializedEvent).not.toContain("auth.example.com");
    expect(serializedEvent).not.toContain("token");
  });

  it("recovers World App stale exact mini app shell paths with a sanitized app-shell loader", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    for (const path of ["/world-miniapp", "/world", "/miniapp", "/mini-app", "/world-app"]) {
      const response = proxy(
        new NextRequest(`https://veripost.io${path}`, {
          headers: {
            accept: "text/html",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "user-agent": "WorldApp iPhone",
          },
        }),
      );

      expect(response.status, path).toBe(200);
      await expectWorldAppFetchedRecovery(response, "/");
      expect(response.headers.get("x-veripost-legacy-miniapp-shell-rewritten"), path).toBe("true");
      expect(response.headers.get("clear-site-data"), path).toBe('"cache", "cookies", "storage"');
    }

    expect(console.info).toHaveBeenCalledWith(
      "legacy_miniapp_shell_entrypoint_blocked",
      expect.stringContaining('"path":"/world-miniapp"'),
    );
  });

  it("returns a same-origin gone response for stale auth API calls", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const response = proxy(
      new NextRequest("https://veripost.io/api/world/rp-signature", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "WorldApp iPhone",
        },
      }),
    );

    expect(response.status).toBe(410);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-veripost-legacy-auth-blocked")).toBe("true");
    expect(response.headers.get("content-security-policy")).toBe(
      "navigate-to 'self' https://x.com/intent/tweet https://twitter.com/intent/tweet mailto:; form-action 'self'",
    );
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "legacy_auth_removed",
        message: "This stale sign-in route has been removed. Reopen VeriPost inside World App to use your logged-in account.",
      },
    });

    const removedMiniAppWalletAuthResponse = proxy(
      new NextRequest("https://veripost.io/api/world-miniapp/wallet-auth/nonce", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "WorldApp iPhone",
        },
      }),
    );

    expect(removedMiniAppWalletAuthResponse.status).toBe(410);
    expect(removedMiniAppWalletAuthResponse.headers.get("location")).toBeNull();

    for (const legacyEndpoint of [
      "https://veripost.io/api/nonce",
      "https://veripost.io/api/complete-siwe",
      "https://veripost.io/api/idkit",
      "https://veripost.io/api/rp-signature",
      "https://veripost.io/api/sign",
      "https://veripost.io/api/verify",
      "https://veripost.io/api/session",
      "https://veripost.io/api/world-miniapp/nonce",
      "https://veripost.io/api/world-miniapp/idkit",
      "https://veripost.io/api/world-miniapp/rp-signature",
      "https://veripost.io/api/world-id/verify",
      "https://veripost.io/world-miniapp/complete-siwe",
    ]) {
      const legacyResponse = proxy(
        new NextRequest(legacyEndpoint, {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "user-agent": "WorldApp iPhone",
          },
        }),
      );

      expect(legacyResponse.status, legacyEndpoint).toBe(410);
      expect(legacyResponse.headers.get("location"), legacyEndpoint).toBeNull();
      expect(legacyResponse.headers.get("x-veripost-legacy-auth-blocked"), legacyEndpoint).toBe("true");
    }
  });

  it("returns a same-origin gone response for top-level stale auth fetches", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const createRequest = (url: string) => new NextRequest(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "WorldApp iPhone",
      },
    });

    for (const legacyEndpoint of [
      "https://veripost.io/api/authenticate",
      "https://veripost.io/api/authorize",
      "https://veripost.io/api/sign-in",
      "https://veripost.io/api/log_in",
      "https://veripost.io/api/x-login",
      "https://veripost.io/api/world-id-auth",
      "https://veripost.io/world/wallet-auth/nonce",
      "https://veripost.io/world/sign-in",
      "https://veripost.io/world/world-sign-in",
      "https://veripost.io/idkit",
      "https://veripost.io/world-auth",
      "https://veripost.io/login-with-x",
      "https://veripost.io/twitter-oauth",
      "https://veripost.io/rp-signature",
      "https://veripost.io/sign",
      "https://veripost.io/world-id/verify",
      "https://veripost.io/world-miniapp/idkit",
      "https://veripost.io/world-miniapp/rp-signature",
    ]) {
      const response = proxy(createRequest(legacyEndpoint));

      expect(response.status, legacyEndpoint).toBe(410);
      expect(response.headers.get("location"), legacyEndpoint).toBeNull();
      expect(response.headers.get("x-veripost-legacy-auth-blocked"), legacyEndpoint).toBe("true");
      await expect(response.json(), legacyEndpoint).resolves.toEqual({
        error: {
          code: "legacy_auth_removed",
          message: "This stale sign-in route has been removed. Reopen VeriPost inside World App to use your logged-in account.",
        },
      });
    }
  });

  it("recovers World App stale document auth form posts with a sanitized app-shell loader", async () => {
    const response = proxy(
      new NextRequest("https://veripost.io/api/auth/signin/twitter", {
        method: "POST",
        headers: {
          accept: "text/html",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "user-agent": "WorldApp iPhone",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expectWorldAppFetchedRecovery(response, "/");
    expect(response.headers.get("x-veripost-legacy-auth-blocked")).toBe("true");
  });

  it("recovers query-bearing World App stale document auth form posts with a sanitized app-shell loader", async () => {
    const response = proxy(
      new NextRequest("https://veripost.io/api/auth/signin/twitter?callbackUrl=https%3A%2F%2Fx.com", {
        method: "POST",
        headers: {
          accept: "text/html",
          "content-type": "application/x-www-form-urlencoded",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "user-agent": "WorldApp iPhone",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expectWorldAppFetchedRecovery(response, "/");
    expect(response.headers.get("x-veripost-legacy-auth-blocked")).toBe("true");
  });

  it("recovers stale auth form posts from World App mobile webviews without document fetch headers", async () => {
    const response = proxy(
      new NextRequest("https://veripost.io/api/auth/signin/twitter", {
        method: "POST",
        headers: {
          accept: "*/*",
          "content-type": "application/x-www-form-urlencoded",
          "user-agent": "WorldApp iPhone",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expectWorldAppFetchedRecovery(response, "/");
  });

  it("recovers sparse World App webview launches with a sanitized app-shell loader", async () => {
    for (const url of [
      "https://veripost.io/api/auth/signin/twitter",
      "https://veripost.io/authenticate",
      "https://veripost.io/authorize",
      "https://veripost.io/sign-in",
      "https://veripost.io/log_in",
      "https://veripost.io/world-miniapp",
    ]) {
      const response = proxy(
        new NextRequest(url, {
          headers: {
            accept: "*/*",
            "user-agent": "WorldApp iPhone",
          },
        }),
      );

      expect(response.status, url).toBe(200);
      await expectWorldAppFetchedRecovery(response, "/");
    }
  });

  it("recovers World App legacy launch requests even when the webview reports cors fetch mode", async () => {
    for (const url of [
      "https://veripost.io/api/auth/signin/twitter",
      "https://veripost.io/api/authenticate",
      "https://veripost.io/api/authorize",
      "https://veripost.io/api/sign-in",
      "https://veripost.io/api/log_in",
      "https://veripost.io/world-miniapp",
    ]) {
      const response = proxy(
        new NextRequest(url, {
          headers: {
            accept: "*/*",
            "sec-fetch-mode": "cors",
            "user-agent": "WorldApp iPhone",
          },
        }),
      );

      expect(response.status, url).toBe(200);
      await expectWorldAppFetchedRecovery(response, "/");
      expect(response.headers.get("location"), url).toBeNull();
    }
  });

  it("recovers sparse non-json legacy reads without relying on World App user agent", async () => {
    const getResponse = proxy(
      new NextRequest("https://veripost.io/api/auth/signin/twitter", {
        headers: {
          accept: "*/*",
          "user-agent": "Mozilla/5.0",
        },
      }),
    );

    expect(getResponse.status).toBe(200);
    expect(getResponse.headers.get("location")).toBeNull();
    expect(getResponse.headers.get("x-middleware-rewrite")).toBeNull();
    expect(getResponse.headers.get("x-veripost-legacy-auth-blocked")).toBe("true");
    expect(getResponse.headers.get("x-veripost-legacy-recovery")).toBe("static");
    const getBody = await getResponse.text();
    expect(getBody).toContain('href="/"');
    expect(getBody).toContain("Returning to VeriPost inside World App.");
    expect(getBody).not.toContain("authentication");
    expect(getBody).not.toContain("http-equiv=\"refresh\"");

    const headResponse = proxy(
      new NextRequest("https://veripost.io/api/auth/signin/twitter", {
        method: "HEAD",
        headers: {
          accept: "*/*",
          "user-agent": "Mozilla/5.0",
        },
      }),
    );

    expect(headResponse.status).toBe(200);
    expect(headResponse.headers.get("location")).toBeNull();
    expect(headResponse.headers.get("x-middleware-rewrite")).toBeNull();
    expect(headResponse.headers.get("x-veripost-legacy-auth-blocked")).toBe("true");
    expect(headResponse.headers.get("x-veripost-legacy-recovery")).toBe("static");
  });

  it("recovers World App stale auth launch paths passed through root query parameters with a sanitized app-shell loader", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    for (const url of [
      "https://veripost.io/?path=%2Fapi%2Fauth%2Fsignin%2Ftwitter",
      "https://veripost.io/?path=%2Fauthenticate",
      "https://veripost.io/?path=%2Fapi%2Fauthorize",
      "https://veripost.io/?path=%2Fsign-in",
      "https://veripost.io/?path=%2Fapi%2Flog_in",
      "https://veripost.io/?next=%2Fworld%2Fwallet-auth%2Fnonce",
      "https://veripost.io/?next=%2Fworld%2Fsign-in",
      "https://veripost.io/?callbackUrl=https%3A%2F%2Fx.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret",
      "https://veripost.io/?redirect_uri=https%3A%2F%2Fx.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret",
      "https://veripost.io/?redirect=https%3A%2F%2Fworld.org%2Fverify%3Frequest_id%3Dsecret",
      "https://veripost.io/?returnTo=worldapp%3A%2F%2Fmini-app%3Fapp_id%3Dsecret",
      "https://veripost.io/?callback=https%3A%2F%2Fx.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret",
      "https://veripost.io/?redirect_to=https%3A%2F%2Fx.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret",
      "https://veripost.io/?returnUrl=worldapp%3A%2F%2Fmini-app%3Fapp_id%3Dsecret",
      "https://veripost.io/?continue=https%3A%2F%2Fauth.example.com%2Foauth%3Ftoken%3Dsecret",
      "https://veripost.io/?target=https%3A%2F%2Fworld.org%2Fmini-app%3Fapp_id%3Dsecret",
      "https://veripost.io/?destinationUrl=https%3A%2F%2Fx.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret",
      "https://veripost.io/?state=https%3A%2F%2Fworldcoin.org%2Fverify%3Frequest_id%3Dsecret",
      "https://veripost.io/?oauth_callback=https%3A%2F%2Fx.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret",
      "https://veripost.io/?deep_link=worldapp%3A%2F%2Fmini-app%3Fapp_id%3Dsecret",
      "https://veripost.io/?fallback=%2Fapi%2Fauth%2Fsignin%2Ftwitter",
      "https://veripost.io/?launch=https%3A%2F%2Fworld.org%2Fmini-app%3Fapp_id%3Dsecret",
      "https://veripost.io/?fallback=api%2Fauth%2Fsignin%2Ftwitter",
      "https://veripost.io/?oauth_callback=x.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret",
      "https://veripost.io/?launch=world.org%2Fmini-app%3Fapp_id%3Dsecret",
      "https://veripost.io/?oauth_path=oauth2%2Fauthorize%3Fclient_id%3Dsecret",
      "https://veripost.io/?redirect=not%20a%20url",
      "https://veripost.io/?callbackUrl=",
      "https://veripost.io/?auth",
      "https://veripost.io/?authenticate=true",
      "https://veripost.io/?authorize=true",
      "https://veripost.io/?logIn=true",
      "https://veripost.io/?sign_in=true",
      "https://veripost.io/?loginWithX=true",
      "https://veripost.io/?oauth_callback=stale",
      "https://veripost.io/?worldSignIn=true",
      "https://veripost.io/?xLogin=true",
      "https://veripost.io/?walletAuth=",
      "https://veripost.io/?world_wallet_auth=true",
    ]) {
      const response = proxy(
        new NextRequest(url, {
          headers: {
            accept: "*/*",
            "user-agent": "WorldApp iPhone",
          },
        }),
      );

      expect(response.status, url).toBe(200);
      await expectWorldAppFetchedRecovery(response, "/");
      expect(response.headers.get("x-veripost-legacy-auth-blocked"), url).toBe("true");
      expect(response.headers.get("x-veripost-legacy-entrypoint-source"), url).toBe("query");
    }

    const serializedEvents = vi.mocked(console.info).mock.calls.map(([, payload]) => String(payload)).join("\n");
    expect(serializedEvents).toContain('"entrypoint":{"source":"query"');
    expect(serializedEvents).toContain('"queryKeys":["path"]');
    expect(serializedEvents).toContain('"queryKeys":["callbackUrl"]');
    expect(serializedEvents).toContain('"queryKeys":["redirect_uri"]');
    expect(serializedEvents).toContain('"queryKeys":["returnTo"]');
    expect(serializedEvents).toContain('"queryKeys":["callback"]');
    expect(serializedEvents).toContain('"queryKeys":["redirect_to"]');
    expect(serializedEvents).toContain('"queryKeys":["returnUrl"]');
    expect(serializedEvents).toContain('"queryKeys":["continue"]');
    expect(serializedEvents).toContain('"queryKeys":["target"]');
    expect(serializedEvents).toContain('"queryKeys":["destinationUrl"]');
    expect(serializedEvents).toContain('"queryKeys":["state"]');
    expect(serializedEvents).toContain('"queryKeys":["oauth_callback"]');
    expect(serializedEvents).toContain('"queryKeys":["deep_link"]');
    expect(serializedEvents).toContain('"queryKeys":["fallback"]');
    expect(serializedEvents).toContain('"queryKeys":["launch"]');
    expect(serializedEvents).toContain('"queryKeys":["oauth_path"]');
    expect(serializedEvents).toContain('"queryKeys":["redirect"]');
    expect(serializedEvents).toContain('"queryKeys":["auth"]');
    expect(serializedEvents).toContain('"queryKeys":["authenticate"]');
    expect(serializedEvents).toContain('"queryKeys":["authorize"]');
    expect(serializedEvents).toContain('"queryKeys":["logIn"]');
    expect(serializedEvents).toContain('"queryKeys":["sign_in"]');
    expect(serializedEvents).toContain('"queryKeys":["loginWithX"]');
    expect(serializedEvents).toContain('"queryKeys":["worldSignIn"]');
    expect(serializedEvents).toContain('"queryKeys":["xLogin"]');
    expect(serializedEvents).toContain('"queryKeys":["walletAuth"]');
    expect(serializedEvents).toContain('"queryKeys":["world_wallet_auth"]');
    expect(serializedEvents).not.toContain("client_id");
    expect(serializedEvents).not.toContain("request_id");
    expect(serializedEvents).not.toContain("app_id");
    expect(serializedEvents).not.toContain("x.com");
    expect(serializedEvents).not.toContain("world.org");
    expect(serializedEvents).not.toContain("worldapp:");
  });

  it("recovers World App stale mini app shell paths passed through root query parameters with a sanitized app-shell loader", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const response = proxy(
      new NextRequest("https://veripost.io/?path=%2Fworld-miniapp", {
        headers: {
          accept: "*/*",
          "user-agent": "WorldApp iPhone",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expectWorldAppFetchedRecovery(response, "/");
    expect(response.headers.get("x-veripost-legacy-miniapp-shell-rewritten")).toBe("true");
    expect(response.headers.get("x-veripost-legacy-entrypoint-source")).toBe("query");
    expect(console.info).toHaveBeenCalledWith(
      "legacy_miniapp_shell_entrypoint_blocked",
      expect.stringContaining('"entrypoint":{"source":"query","queryKeys":["path"]}'),
    );
  });

  it("does not trap current root launches or post-proof X intents in root query parameters", () => {
    for (const url of [
      "https://veripost.io/?path=%2F",
      "https://veripost.io/?next=%2Fproof%2Fvp_123",
      "https://veripost.io/?url=https%3A%2F%2Fx.com%2Fintent%2Ftweet%3Ftext%3Dhello",
      "https://veripost.io/?target=https%3A%2F%2Fx.com%2Fintent%2Ftweet%3Ftext%3Dhello",
      "https://veripost.io/?continueUrl=%2Fproof%2Fvp_123",
      "https://veripost.io/?returnUrl=%2Fproof%2Fvp_123",
      "https://veripost.io/?note=world",
      "https://veripost.io/?utm=https%3A%2F%2Fx.com%2Fintent%2Ftweet%3Ftext%3Dhello",
      "https://veripost.io/?utm=twitter.com%2Fintent%2Ftweet%3Ftext%3Dhello",
    ]) {
      const response = proxy(
        new NextRequest(url, {
          headers: {
            accept: "*/*",
            "user-agent": "WorldApp iPhone",
          },
        }),
      );

      expect(response.headers.get("x-middleware-rewrite"), url).toBeNull();
      expect(response.headers.get("x-veripost-legacy-auth-blocked"), url).toBeNull();
    }
  });

  it("recovers sparse World App webview auth posts without form content type", async () => {
    const response = proxy(
      new NextRequest("https://veripost.io/api/auth/signin/twitter", {
        method: "POST",
        headers: {
          accept: "*/*",
          "user-agent": "WorldApp iPhone",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expectWorldAppFetchedRecovery(response, "/");
  });

  it("does not trap current public proof routes", () => {
    const response = proxy(
      new NextRequest("https://veripost.io/proof/vp_123", {
        headers: {
          accept: "text/html",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "user-agent": "WorldApp iPhone",
        },
      }),
    );

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-veripost-legacy-auth-blocked")).toBeNull();
  });

  it("traps stale World wallet-auth nonce routes", async () => {
    const response = proxy(
      new NextRequest("https://veripost.io/api/world-wallet-auth/nonce", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-veripost-world-app-flow": "idkit-native",
          "user-agent": "WorldApp iPhone",
        },
      }),
    );

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("x-veripost-legacy-auth-blocked")).toBe("true");
    expect(response.headers.get("x-veripost-legacy-recovery")).toBeNull();
    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "legacy_auth_removed" },
    });
  });

  it("traps stale World wallet-auth JSON posts even when Accept is sparse", async () => {
    const response = proxy(
      new NextRequest("https://veripost.io/api/world-wallet-auth/nonce", {
        method: "POST",
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          "x-veripost-world-app-flow": "idkit-native",
          "user-agent": "WorldApp iPhone",
        },
      }),
    );

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("x-veripost-legacy-auth-blocked")).toBe("true");
    expect(response.headers.get("x-veripost-legacy-recovery")).toBeNull();
    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "legacy_auth_removed" },
    });
  });
});

function getSetCookieHeaders(headers: Headers): string[] {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  if (getSetCookie) return getSetCookie.call(headers);

  const header = headers.get("set-cookie");
  return header ? header.split(/,(?=\s*[^;,\s]+=)/) : [];
}

async function expectWorldAppFetchedRecovery(response: Response, targetPath: string): Promise<void> {
  expect(response.headers.get("location")).toBeNull();
  expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  expect(response.headers.get("x-veripost-legacy-recovery")).toBe("static-fetch");
  expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
  const body = await response.text();
  expect(body).toContain(`const target="${targetPath}"`);
  expect(body).toContain("history.replaceState(window.history.state,\"\",target)");
  expect(body).toContain("fetch(target,{credentials:\"same-origin\",cache:\"no-store\"})");
  expect(body).toContain(`href="${targetPath}"`);
  expect(body).toContain("Returning to VeriPost inside World App.");
  expect(body).not.toContain("window.location");
  expect(body).not.toContain("http-equiv=\"refresh\"");
  expect(body).not.toContain("authentication");
  expect(body).not.toContain("callbackUrl");
  expect(body).not.toContain("redirect_uri");
  expect(body).not.toContain("client_id");
  expect(body).not.toContain("https://x.com");
  expect(body).not.toContain("worldapp:");
  expect(body).not.toContain("worldcoin.org");
  expect(body).not.toContain("auth.example.com");
  expect(body).not.toContain("token");
  expect(body).not.toContain("app_id");
}
