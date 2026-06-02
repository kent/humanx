// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  installInAppNavigationGuard,
  isAllowedPostProofNavigation,
  type BlockedNavigationAttempt,
} from "@/lib/in-app-navigation-guard";

const originalOpen = window.open;

beforeEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  window.open = originalOpen;
  Reflect.deleteProperty(window, "navigation");
  vi.restoreAllMocks();
});

function installFakeNavigationApi() {
  let navigateHandler: ((event: Event & { destination?: { url?: string } }) => void) | undefined;
  const navigation = {
    addEventListener: vi.fn((type: string, handler: EventListenerOrEventListenerObject) => {
      if (type === "navigate" && typeof handler === "function") {
        navigateHandler = handler as (event: Event & { destination?: { url?: string } }) => void;
      }
    }),
    removeEventListener: vi.fn(),
  };

  Object.defineProperty(window, "navigation", {
    configurable: true,
    value: navigation,
  });

  return {
    navigation,
    navigate: (url: string) => {
      const event = {
        destination: { url },
        preventDefault: vi.fn(),
        stopImmediatePropagation: vi.fn(),
      } as unknown as Event & { destination?: { url?: string } };

      navigateHandler?.(event);
      return event;
    },
  };
}

describe("in-app navigation guard", () => {
  it("blocks external auth navigation attempts without exposing query strings", () => {
    const openedUrls: string[] = [];
    const blocked: BlockedNavigationAttempt[] = [];
    window.open = vi.fn((url?: string | URL) => {
      openedUrls.push(String(url));
      return null;
    });

    const cleanup = installInAppNavigationGuard(window, {
      onBlockedNavigation: (attempt) => blocked.push(attempt),
    });

    expect(window.open("https://auth.example.com/oauth?token=secret")).toBeNull();

    expect(openedUrls).toEqual([]);
    expect(blocked).toEqual([
      {
        trigger: "window_open",
        target: "https://auth.example.com/oauth?...",
      },
    ]);

    cleanup();
  });

  it("blocks same-origin legacy auth route navigations", () => {
    const blocked: BlockedNavigationAttempt[] = [];
    const blockedProofSessionRoute = `/api/proof-session/${"nonce"}`;
    const blockedTopLevelProofSessionRoute = `/proof-session/${"nonce"}`;
    const blockedWorldSignatureRoute = `/api/world/${["rp", "signature"].join("-")}`;
    window.open = vi.fn(() => null);

    const cleanup = installInAppNavigationGuard(window, {
      onBlockedNavigation: (attempt) => blocked.push(attempt),
    });

    window.open("/api/auth/signin/twitter");
    window.open("/api/authenticate");
    window.open("/api/authorize");
    window.open(blockedWorldSignatureRoute);
    window.open("/api/world/auth/session");
    window.open("/api/world/authenticate");
    window.open("/api/world/authorize");
    window.open("/api/world/verify");
    window.open("/api/oauth/twitter");
    window.open("/api/idkit");
    window.open("/api/rp-signature");
    window.open("/api/sign");
    window.open("/api/world-id/verify");
    window.open(blockedProofSessionRoute);
    window.open("/api/nonce");
    window.open("/api/complete-siwe");
    window.open("/api/world-miniapp/nonce");
    window.open("/api/world-miniapp/idkit");
    window.open("/api/world-miniapp/rp-signature");
    window.open("/world-miniapp/complete-siwe");
    window.open("/world-miniapp/authenticate");
    window.open("/world-miniapp/authorize");
    window.open("/world-miniapp/idkit");
    window.open("/world-miniapp");
    window.open("/world");
    window.open("/login?return_to=https%3A%2F%2Fx.com");
    window.open("/log-in?return_to=https%3A%2F%2Fx.com");
    window.open("/sign_in?callbackUrl=https%3A%2F%2Fx.com");
    window.open("/authenticate");
    window.open("/authorize");
    window.open("/api/sign-in");
    window.open("/world/sign-in");
    window.open("/world-auth");
    window.open("/world/wallet-auth/nonce");
    window.open("/world-id/verify");
    window.open(blockedTopLevelProofSessionRoute);

    expect(blocked).toEqual([
      {
        trigger: "window_open",
        target: "http://localhost:3000/api/auth/signin/twitter",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/api/authenticate",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/api/authorize",
      },
      {
        trigger: "window_open",
        target: `http://localhost:3000${blockedWorldSignatureRoute}`,
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/api/world/auth/session",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/api/world/authenticate",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/api/world/authorize",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/api/world/verify",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/api/oauth/twitter",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/api/idkit",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/api/rp-signature",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/api/sign",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/api/world-id/verify",
      },
      {
        trigger: "window_open",
        target: `http://localhost:3000${blockedProofSessionRoute}`,
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/api/nonce",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/api/complete-siwe",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/api/world-miniapp/nonce",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/api/world-miniapp/idkit",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/api/world-miniapp/rp-signature",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/world-miniapp/complete-siwe",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/world-miniapp/authenticate",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/world-miniapp/authorize",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/world-miniapp/idkit",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/world-miniapp",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/world",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/login?...",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/log-in?...",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/sign_in?...",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/authenticate",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/authorize",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/api/sign-in",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/world/sign-in",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/world-auth",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/world/wallet-auth/nonce",
      },
      {
        trigger: "window_open",
        target: "http://localhost:3000/world-id/verify",
      },
      {
        trigger: "window_open",
        target: `http://localhost:3000${blockedTopLevelProofSessionRoute}`,
      },
    ]);

    cleanup();
  });

  it("blocks same-origin combined stale auth alias navigations", () => {
    const blocked: BlockedNavigationAttempt[] = [];
    window.open = vi.fn(() => null);

    const cleanup = installInAppNavigationGuard(window, {
      onBlockedNavigation: (attempt) => blocked.push(attempt),
    });

    const hrefs = [
      "/login-with-x",
      "/api/x-login",
      "/twitter-oauth",
      "/auth-callback",
      "/oauth_callback",
      "/connect-wallet",
      "/sign-in-with-x",
      "/world/world-sign-in",
      "/api/world/world-id-auth",
      "/world-miniapp/worldid-login",
    ];
    for (const href of hrefs) {
      window.open(href);
    }

    expect(blocked).toEqual(hrefs.map((href) => ({
      trigger: "window_open",
      target: `http://localhost:3000${href}`,
    })));

    cleanup();
  });

  it("blocks Navigation API stale same-origin route navigations before unload", () => {
    const blocked: BlockedNavigationAttempt[] = [];
    const fakeNavigation = installFakeNavigationApi();

    const cleanup = installInAppNavigationGuard(window, {
      onBlockedNavigation: (attempt) => blocked.push(attempt),
    });

    const event = fakeNavigation.navigate(`${window.location.origin}/proof-session/nonce?return_to=x`);

    expect(fakeNavigation.navigation.addEventListener).toHaveBeenCalledWith("navigate", expect.any(Function), true);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopImmediatePropagation).toHaveBeenCalledOnce();
    expect(blocked).toEqual([
      {
        trigger: "navigation_api",
        target: "http://localhost:3000/proof-session/nonce?...",
      },
    ]);

    cleanup();

    expect(fakeNavigation.navigation.removeEventListener).toHaveBeenCalledWith("navigate", expect.any(Function), true);
  });

  it("blocks Navigation API external auth navigation attempts without exposing query strings", () => {
    const blocked: BlockedNavigationAttempt[] = [];
    const fakeNavigation = installFakeNavigationApi();

    const cleanup = installInAppNavigationGuard(window, {
      onBlockedNavigation: (attempt) => blocked.push(attempt),
    });

    const event = fakeNavigation.navigate("https://auth.example.com/oauth?token=secret");

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopImmediatePropagation).toHaveBeenCalledOnce();
    expect(blocked).toEqual([
      {
        trigger: "navigation_api",
        target: "https://auth.example.com/oauth?...",
      },
    ]);

    cleanup();
  });

  it("blocks stale same-origin root query handoffs without exposing values", () => {
    const blocked: BlockedNavigationAttempt[] = [];
    window.open = vi.fn(() => null);

    const cleanup = installInAppNavigationGuard(window, {
      onBlockedNavigation: (attempt) => blocked.push(attempt),
    });

    window.open("/?path=%2Fapi%2Fauth%2Fsignin%2Ftwitter");
    window.open("/?redirect_uri=https%3A%2F%2Fx.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret");
    window.open("/?returnTo=worldapp%3A%2F%2Fmini-app%3Fapp_id%3Dsecret");
    window.open("/?path=https%3A%2F%2Fworldcoin.org%2Fverify%3Fapp_id%3Dsecret");
    window.open("/?url=https%3A%2F%2Fauth.example.com%2Foauth%3Ftoken%3Dsecret");
    window.open("/?returnUrl=worldapp%3A%2F%2Fmini-app%3Fapp_id%3Dsecret");
    window.open("/?redirect_to=https%3A%2F%2Fx.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret");
    window.open("/?continue=https%3A%2F%2Fauth.example.com%2Foauth%3Ftoken%3Dsecret");
    window.open("/?target=https%3A%2F%2Fworld.org%2Fmini-app%3Fapp_id%3Dsecret");
    window.open("/?state=https%3A%2F%2Fworldcoin.org%2Fverify%3Frequest_id%3Dsecret");
    window.open("/?oauth_callback=https%3A%2F%2Fx.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret");
    window.open("/?deep_link=worldapp%3A%2F%2Fmini-app%3Fapp_id%3Dsecret");
    window.open("/?fallback=%2Fapi%2Fauth%2Fsignin%2Ftwitter");
    window.open("/?launch=https%3A%2F%2Fworld.org%2Fmini-app%3Fapp_id%3Dsecret");
    window.open("/?fallback=api%2Fauth%2Fsignin%2Ftwitter");
    window.open("/?oauth_callback=x.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret");
    window.open("/?launch=world.org%2Fmini-app%3Fapp_id%3Dsecret");
    window.open("/?oauth_path=oauth2%2Fauthorize%3Fclient_id%3Dsecret");
    window.open("/?callbackUrl=");
    window.open("/?auth");
    window.open("/?authenticate=true");
    window.open("/?authorize=true");
    window.open("/?logIn=true");
    window.open("/?sign_in=true");
    window.open("/?loginWithX=true");
    window.open("/?oauth_callback=stale");
    window.open("/?worldSignIn=true");
    window.open("/?xLogin=true");
    window.open("/?walletAuth=");
    window.open("/?world_wallet_auth=true");

    expect(blocked).toEqual(Array.from({ length: 30 }, () => ({
      trigger: "window_open",
      target: "http://localhost:3000/?...",
    })));
    expect(JSON.stringify(blocked)).not.toContain("client_id");
    expect(JSON.stringify(blocked)).not.toContain("app_id");
    expect(JSON.stringify(blocked)).not.toContain("request_id");
    expect(JSON.stringify(blocked)).not.toContain("worldapp:");
    expect(JSON.stringify(blocked)).not.toContain("worldcoin.org");
    expect(JSON.stringify(blocked)).not.toContain("world.org");
    expect(JSON.stringify(blocked)).not.toContain("auth.example.com");
    expect(JSON.stringify(blocked)).not.toContain("token");

    cleanup();
  });

  it("blocks stale same-origin hash handoffs without exposing values", () => {
    const blocked: BlockedNavigationAttempt[] = [];
    window.open = vi.fn(() => null);

    const cleanup = installInAppNavigationGuard(window, {
      onBlockedNavigation: (attempt) => blocked.push(attempt),
    });

    window.open("/#/api/auth/signin/twitter?callbackUrl=https%3A%2F%2Fx.com%2Fsecret");
    window.open("/#?returnTo=worldapp%3A%2F%2Fmini-app%3Fapp_id%3Dsecret");
    window.open("/#https%3A%2F%2Fx.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret");
    window.open("/#https%3A%2F%2Fworldcoin.org%2Fverify%3Fapp_id%3Dsecret");
    window.open("/#?deep_link=worldapp%3A%2F%2Fmini-app%3Fapp_id%3Dsecret");
    window.open("/#?fallback=api%2Fauth%2Fsignin%2Ftwitter");
    window.open("/#?oauth_callback=x.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret");
    window.open("/#fallback=api%2Fauth%2Fsignin%2Ftwitter");
    window.open("/#oauth_callback=x.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret");

    expect(blocked).toEqual(Array.from({ length: 9 }, () => ({
      trigger: "window_open",
      target: "http://localhost:3000/?...",
    })));
    expect(JSON.stringify(blocked)).not.toContain("client_id");
    expect(JSON.stringify(blocked)).not.toContain("app_id");
    expect(JSON.stringify(blocked)).not.toContain("worldapp:");
    expect(JSON.stringify(blocked)).not.toContain("worldcoin.org");

    cleanup();
  });

  it("blocks stale history state handoffs without exposing values", () => {
    const blocked: BlockedNavigationAttempt[] = [];
    const cleanup = installInAppNavigationGuard(window, {
      onBlockedNavigation: (attempt) => blocked.push(attempt),
    });

    window.history.pushState(
      null,
      "",
      "/?oauth_callback=x.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret",
    );
    window.history.replaceState(null, "", "/#fallback=api%2Fauth%2Fsignin%2Ftwitter");
    window.history.pushState(null, "", "/proof/vp_123");

    expect(window.location.pathname).toBe("/proof/vp_123");
    expect(blocked).toEqual([
      {
        trigger: "history_push_state",
        target: "http://localhost:3000/?...",
      },
      {
        trigger: "history_replace_state",
        target: "http://localhost:3000/?...",
      },
    ]);
    expect(JSON.stringify(blocked)).not.toContain("client_id");
    expect(JSON.stringify(blocked)).not.toContain("secret");

    cleanup();
  });

  it("keeps guarded history methods writable for framework router patches", () => {
    const cleanup = installInAppNavigationGuard(window, {});
    const guardedPushState = window.history.pushState;
    const guardedReplaceState = window.history.replaceState;
    const nextPushState = vi.fn();
    const nextReplaceState = vi.fn();

    expect(Object.getOwnPropertyDescriptor(window.history, "pushState")?.writable).toBe(true);
    expect(Object.getOwnPropertyDescriptor(window.history, "replaceState")?.writable).toBe(true);
    expect(() => {
      window.history.pushState = nextPushState as History["pushState"];
      window.history.replaceState = nextReplaceState as History["replaceState"];
    }).not.toThrow();
    expect(window.history.pushState).toBe(nextPushState);
    expect(window.history.replaceState).toBe(nextReplaceState);

    window.history.pushState = guardedPushState;
    window.history.replaceState = guardedReplaceState;
    cleanup();
  });

  it("recovers direct stale hash mutations without leaving a safe app path", () => {
    const blocked: BlockedNavigationAttempt[] = [];
    const cleanup = installInAppNavigationGuard(window, {
      onBlockedNavigation: (attempt) => blocked.push(attempt),
    });

    window.history.pushState(null, "", "/proof/vp_123?debug=world");
    window.location.hash = "oauth_callback=x.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret";
    window.dispatchEvent(new Event("hashchange"));

    expect(window.location.pathname).toBe("/proof/vp_123");
    expect(window.location.search).toBe("?debug=world");
    expect(window.location.hash).toBe("");
    expect(blocked).toEqual([
      {
        trigger: "hashchange",
        target: "http://localhost:3000/proof/vp_123?...",
      },
    ]);
    expect(JSON.stringify(blocked)).not.toContain("client_id");
    expect(JSON.stringify(blocked)).not.toContain("secret");

    cleanup();
  });

  it("allows safe same-origin root query handoffs", () => {
    const openedUrls: string[] = [];
    const blocked: BlockedNavigationAttempt[] = [];
    window.open = vi.fn((url?: string | URL) => {
      openedUrls.push(String(url));
      return null;
    });

    const cleanup = installInAppNavigationGuard(window, {
      onBlockedNavigation: (attempt) => blocked.push(attempt),
    });

    window.open("/?path=%2F");
    window.open("/?path=%2Fproof%2Fvp_123");
    window.open("/?url=https%3A%2F%2Fx.com%2Fintent%2Ftweet%3Ftext%3Dhello");
    window.open("/?target=https%3A%2F%2Fx.com%2Fintent%2Ftweet%3Ftext%3Dhello");
    window.open("/?continueUrl=%2Fproof%2Fvp_123");
    window.open("/?returnUrl=%2Fproof%2Fvp_123");
    window.open("/?note=world");
    window.open("/?utm=https%3A%2F%2Fx.com%2Fintent%2Ftweet%3Ftext%3Dhello");
    window.open("/?utm=twitter.com%2Fintent%2Ftweet%3Ftext%3Dhello");

    expect(openedUrls).toEqual([
      "/?path=%2F",
      "/?path=%2Fproof%2Fvp_123",
      "/?url=https%3A%2F%2Fx.com%2Fintent%2Ftweet%3Ftext%3Dhello",
      "/?target=https%3A%2F%2Fx.com%2Fintent%2Ftweet%3Ftext%3Dhello",
      "/?continueUrl=%2Fproof%2Fvp_123",
      "/?returnUrl=%2Fproof%2Fvp_123",
      "/?note=world",
      "/?utm=https%3A%2F%2Fx.com%2Fintent%2Ftweet%3Ftext%3Dhello",
      "/?utm=twitter.com%2Fintent%2Ftweet%3Ftext%3Dhello",
    ]);
    expect(blocked).toEqual([]);

    cleanup();
  });

  it("blocks programmatic external auth form submissions", () => {
    const blocked: BlockedNavigationAttempt[] = [];
    const form = document.createElement("form");
    form.action = "https://auth.example.com/oauth?token=secret";
    document.body.append(form);

    const cleanup = installInAppNavigationGuard(window, {
      onBlockedNavigation: (attempt) => blocked.push(attempt),
    });

    form.submit();

    expect(blocked).toEqual([
      {
        trigger: "form_submit_method",
        target: "https://auth.example.com/oauth?...",
      },
    ]);

    cleanup();
  });

  it("blocks programmatic requestSubmit navigations using a submitter formAction", () => {
    const blocked: BlockedNavigationAttempt[] = [];
    const form = document.createElement("form");
    form.action = "/proof/vp_123";
    const button = document.createElement("button");
    button.type = "submit";
    Object.defineProperty(button, "formAction", {
      configurable: true,
      value: "https://x.com/i/oauth2/authorize?client_id=secret",
    });
    form.append(button);
    document.body.append(form);

    const cleanup = installInAppNavigationGuard(window, {
      onBlockedNavigation: (attempt) => blocked.push(attempt),
    });

    form.requestSubmit(button);

    expect(blocked).toEqual([
      {
        trigger: "form_request_submit",
        target: "https://x.com/i/oauth2/authorize?...",
      },
    ]);

    cleanup();
  });

  it("blocks beforeunload when the app is in a protected native proof phase", () => {
    const blocked: BlockedNavigationAttempt[] = [];
    const cleanup = installInAppNavigationGuard(window, {
      blockBeforeUnload: () => true,
      onBlockedNavigation: (attempt) => blocked.push(attempt),
    });

    const event = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(event.returnValue).toBe("");
    expect(blocked).toEqual([
      {
        trigger: "beforeunload",
        target: "unknown",
      },
    ]);

    cleanup();
  });

  it("allows beforeunload when the protected native proof phase is inactive", () => {
    const blocked: BlockedNavigationAttempt[] = [];
    const cleanup = installInAppNavigationGuard(window, {
      blockBeforeUnload: () => false,
      onBlockedNavigation: (attempt) => blocked.push(attempt),
    });

    const event = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(blocked).toEqual([]);

    cleanup();
  });

  it("allows same-origin app links and an explicit post-proof X intent", () => {
    const openedUrls: string[] = [];
    const blocked: BlockedNavigationAttempt[] = [];
    window.open = vi.fn((url?: string | URL) => {
      openedUrls.push(String(url));
      return null;
    });

    const cleanup = installInAppNavigationGuard(window, {
      allowNavigation: (url) => isAllowedPostProofNavigation(url),
      onBlockedNavigation: (attempt) => blocked.push(attempt),
    });

    const proofLink = document.createElement("a");
    proofLink.href = "/proof/vp_123";
    document.body.append(proofLink);

    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    proofLink.dispatchEvent(click);
    window.open("https://x.com/intent/tweet?text=hello");

    expect(click.defaultPrevented).toBe(false);
    expect(openedUrls).toEqual(["https://x.com/intent/tweet?text=hello"]);
    expect(blocked).toEqual([]);

    cleanup();
  });

  it("allows Navigation API explicit post-proof X intent navigation", () => {
    const blocked: BlockedNavigationAttempt[] = [];
    const fakeNavigation = installFakeNavigationApi();

    const cleanup = installInAppNavigationGuard(window, {
      allowNavigation: (url) => isAllowedPostProofNavigation(url),
      onBlockedNavigation: (attempt) => blocked.push(attempt),
    });

    const event = fakeNavigation.navigate("https://x.com/intent/tweet?text=hello");

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopImmediatePropagation).not.toHaveBeenCalled();
    expect(blocked).toEqual([]);

    cleanup();
  });
});
