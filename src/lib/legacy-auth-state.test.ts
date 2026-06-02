// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  LEGACY_AUTH_COOKIE_PATHS,
  LEGACY_AUTH_COOKIE_NAMES,
  purgeLegacyBrowserAuthState,
  purgeLegacyBrowserRuntimeCaches,
} from "@/lib/legacy-auth-state";

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();

  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim();
    if (name) {
      document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0`;
    }
  }
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, "caches");
  Reflect.deleteProperty(window.navigator, "serviceWorker");
});

describe("legacy auth state purge", () => {
  it("removes stale auth, wallet, and connector storage without deleting VeriPost proof state", () => {
    window.localStorage.setItem("veripost:last-proof", "keep");
    window.localStorage.setItem("next-auth.callback-url", "remove");
    window.localStorage.setItem("wagmi.store", "remove");
    window.localStorage.setItem("WalletConnect", "remove");
    window.localStorage.setItem("world_wallet_auth_challenge", "remove");
    window.sessionStorage.setItem("siwe.message", "remove");
    window.sessionStorage.setItem("draft", "keep");

    purgeLegacyBrowserAuthState();

    expect(window.localStorage.getItem("veripost:last-proof")).toBe("keep");
    expect(window.sessionStorage.getItem("draft")).toBe("keep");
    expect(window.localStorage.getItem("next-auth.callback-url")).toBeNull();
    expect(window.localStorage.getItem("wagmi.store")).toBeNull();
    expect(window.localStorage.getItem("WalletConnect")).toBeNull();
    expect(window.localStorage.getItem("world_wallet_auth_challenge")).toBeNull();
    expect(window.sessionStorage.getItem("siwe.message")).toBeNull();
  });

  it("expires known non-HttpOnly legacy auth cookies in WebViews that ignore Clear-Site-Data", () => {
    document.cookie = "next-auth.session-token=abc; Path=/";
    document.cookie = "authjs.session-token=def; Path=/";
    document.cookie = "world_wallet_auth_nonce=ghi; Path=/";
    document.cookie = "veripost-current=keep; Path=/";

    purgeLegacyBrowserAuthState();

    expect(document.cookie).toContain("veripost-current=keep");
    for (const cookieName of LEGACY_AUTH_COOKIE_NAMES) {
      expect(document.cookie).not.toContain(`${cookieName}=`);
    }
  });

  it("includes stale sign-in and combined auth aliases in cookie cleanup paths", () => {
    expect(LEGACY_AUTH_COOKIE_PATHS).toEqual(expect.arrayContaining([
      "/sign-in",
      "/log_in",
      "/world-auth",
      "/api/sign-in",
      "/api/log_in",
      "/api/world-auth",
      "/world/sign-in",
      "/api/world/sign-in",
      "/login-with-x",
      "/api/x-login",
      "/world/world-sign-in",
      "/api/world/world-id-auth",
      "/world-miniapp/oauth-callback",
      "/api/world-miniapp/connect-wallet",
    ]));
  });

  it("removes CacheStorage entries and unregisters service workers for stale shells", async () => {
    const unregister = vi.fn(async () => true);
    const deleteCache = vi.fn(async () => true);

    Object.defineProperty(window, "caches", {
      configurable: true,
      value: {
        keys: vi.fn(async () => ["old-auth-shell", "old-wallet-assets"]),
        delete: deleteCache,
      },
    });
    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistrations: vi.fn(async () => [
          { unregister },
          { unregister },
        ]),
      },
    });

    await purgeLegacyBrowserRuntimeCaches(window);

    expect(deleteCache).toHaveBeenCalledWith("old-auth-shell");
    expect(deleteCache).toHaveBeenCalledWith("old-wallet-assets");
    expect(unregister).toHaveBeenCalledTimes(2);
  });

  it("starts runtime cache cleanup from the regular legacy state purge", async () => {
    const unregister = vi.fn(async () => true);
    const deleteCache = vi.fn(async () => true);

    Object.defineProperty(window, "caches", {
      configurable: true,
      value: {
        keys: vi.fn(async () => ["old-auth-shell"]),
        delete: deleteCache,
      },
    });
    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistrations: vi.fn(async () => [{ unregister }]),
      },
    });

    purgeLegacyBrowserAuthState();
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(deleteCache).toHaveBeenCalledWith("old-auth-shell");
    expect(unregister).toHaveBeenCalledOnce();
  });
});
