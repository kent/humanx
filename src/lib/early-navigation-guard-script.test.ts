// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EARLY_IN_APP_NAVIGATION_GUARD_SCRIPT } from "@/lib/early-navigation-guard-script";

type EarlyNavigationWindow = Window & {
  ReactNativeWebView?: {
    postMessage?: (payload: string) => void;
  };
  WorldApp?: unknown;
  __veripostAllowPostProofNavigation?: boolean;
  __veripostEarlyBlockedNavigations?: Array<{ trigger: string; target: string }>;
  __veripostEarlyNavigationGuardCleanup?: () => void;
  __veripostEarlyNavigationGuardInstalled?: boolean;
  __veripostEarlyRuntimeInitialReported?: boolean;
  webkit?: {
    messageHandlers?: Record<string, {
      postMessage?: (payload: unknown) => void;
    } | undefined>;
  };
};

const originalOpen = window.open;
const originalUserAgent = window.navigator.userAgent;

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  Object.defineProperty(window.navigator, "sendBeacon", {
    configurable: true,
    value: vi.fn(() => true),
  });
});

afterEach(() => {
  earlyWindow().__veripostEarlyNavigationGuardCleanup?.();
  vi.useRealTimers();
  document.body.innerHTML = "";
  window.open = originalOpen;
  Reflect.deleteProperty(window.navigator, "sendBeacon");
  Reflect.deleteProperty(window, "__veripostAllowPostProofNavigation");
  Reflect.deleteProperty(window, "__veripostEarlyBlockedNavigations");
  Reflect.deleteProperty(window, "__veripostEarlyNavigationGuardCleanup");
  Reflect.deleteProperty(window, "__veripostEarlyNavigationGuardInstalled");
  Reflect.deleteProperty(window, "__veripostEarlyRuntimeInitialReported");
  Reflect.deleteProperty(window, "ReactNativeWebView");
  Reflect.deleteProperty(window, "WorldApp");
  Reflect.deleteProperty(window, "webkit");
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: originalUserAgent,
  });
  vi.restoreAllMocks();
});

function installEarlyGuard() {
  new Function(EARLY_IN_APP_NAVIGATION_GUARD_SCRIPT)();
}

function earlyWindow(): EarlyNavigationWindow {
  return window as EarlyNavigationWindow;
}

async function readBeaconPayloads(beaconPayloads: Array<{ data: BodyInit | null; url: string }>) {
  return Promise.all(beaconPayloads.map(async ({ data }) => JSON.parse(await (data as Blob).text()) as {
    diagnostics: {
      nativeTransport?: boolean;
      walletAddress?: string;
      worldAppRuntime?: boolean;
      worldAppUserAgent?: boolean;
    };
    errorMessage?: string;
    event: string;
    phase: string;
    sessionId?: string;
  }));
}

describe("early in-app navigation guard script", () => {
  it("reports initial World App runtime evidence before React hydration", async () => {
    const beaconPayloads: Array<{ data: BodyInit | null; url: string }> = [];
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: "WorldApp iPhone",
    });
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      value: vi.fn((url: string, data: BodyInit | null) => {
        beaconPayloads.push({ url, data });
        return true;
      }),
    });

    installEarlyGuard();

    expect(beaconPayloads).toHaveLength(1);
    expect(beaconPayloads[0].url).toBe("/api/runtime-diagnostics");
    const [payload] = await readBeaconPayloads(beaconPayloads);
    expect(payload).toEqual(expect.objectContaining({
      event: "world_runtime_initial",
      phase: "loading",
      sessionId: expect.stringMatching(/^[a-z0-9-]{8,80}$/i),
    }));
    expect(payload.errorMessage).toBeUndefined();
    expect(payload.diagnostics).toEqual(expect.objectContaining({
      walletAddress: "missing",
      worldAppUserAgent: true,
    }));
    expect(JSON.stringify(payload)).not.toContain("wallet_address");
    expect(JSON.stringify(payload)).not.toContain("draftText");
  });

  it("blocks direct native bridge commands before React hydration while allowing account init", async () => {
    const beaconPayloads: Array<{ data: BodyInit | null; url: string }> = [];
    const postMessage = vi.fn();
    const blockedCommands: string[] = [];
    const handleBlockedCommand = (event: Event) => {
      blockedCommands.push(String((event as CustomEvent<{ command: string }>).detail.command));
    };
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      value: vi.fn((url: string, data: BodyInit | null) => {
        beaconPayloads.push({ url, data });
        return true;
      }),
    });
    earlyWindow().webkit = {
      messageHandlers: {
        minikit: {
          postMessage,
        },
      },
    };
    window.addEventListener("veripost:native-command-blocked", handleBlockedCommand);

    installEarlyGuard();
    earlyWindow().webkit?.messageHandlers?.minikit?.postMessage?.({
      command: "init",
      payload: {
        version: 1,
      },
    });
    earlyWindow().webkit?.messageHandlers?.minikit?.postMessage?.({
      command: "verify",
    });

    window.removeEventListener("veripost:native-command-blocked", handleBlockedCommand);
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(blockedCommands).toEqual(["verify"]);
    expect(earlyWindow().__veripostEarlyBlockedNavigations).toEqual([
      {
        trigger: "early_native_command",
        target: "native-command=blocked",
      },
    ]);
    expect(beaconPayloads).toHaveLength(2);
    const payloads = await readBeaconPayloads(beaconPayloads);
    expect(payloads.map((payload) => payload.event)).toEqual([
      "world_runtime_initial",
      "world_external_navigation_blocked",
    ]);
    const payload = payloads[1];
    expect(payload).toEqual(expect.objectContaining({
      event: "world_external_navigation_blocked",
      phase: "loading",
      errorMessage: "Blocked early_native_command navigation to native-command=blocked before React hydration.",
    }));
    expect(payload.diagnostics.nativeTransport).toBe(true);
  });

  it("blocks direct Android bridge command strings before React hydration while allowing account init", () => {
    const postMessage = vi.fn();
    earlyWindow().ReactNativeWebView = {
      postMessage,
    };

    installEarlyGuard();
    earlyWindow().ReactNativeWebView?.postMessage?.(JSON.stringify({
      command: "init",
      payload: {
        version: 1,
      },
    }));
    earlyWindow().ReactNativeWebView?.postMessage?.(JSON.stringify({
      command: "sign-message",
    }));

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(earlyWindow().__veripostEarlyBlockedNavigations).toEqual([
      {
        trigger: "early_native_command",
        target: "native-command=blocked",
      },
    ]);
  });

  it("blocks direct native bridge commands that appear after the head guard installs", () => {
    vi.useFakeTimers();
    const postMessage = vi.fn();
    earlyWindow().WorldApp = {
      supported_commands: [
        { name: "wallet-auth", supported_versions: [2] },
      ],
    };

    installEarlyGuard();
    earlyWindow().webkit = {
      messageHandlers: {
        minikit: {
          postMessage,
        },
      },
    };
    vi.advanceTimersByTime(50);

    earlyWindow().webkit?.messageHandlers?.minikit?.postMessage?.({
      command: "init",
      payload: {
        version: 1,
      },
    });
    earlyWindow().webkit?.messageHandlers?.minikit?.postMessage?.({
      command: "wallet-auth",
    });

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(earlyWindow().__veripostEarlyBlockedNavigations).toEqual([
      {
        trigger: "early_native_command",
        target: "native-command=blocked",
      },
    ]);
  });

  it("normalizes stale auth launch URLs before React hydration", async () => {
    const beaconPayloads: Array<{ data: BodyInit | null; url: string }> = [];
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      value: vi.fn((url: string, data: BodyInit | null) => {
        beaconPayloads.push({ url, data });
        return true;
      }),
    });
    window.history.replaceState(
      null,
      "",
      "/api/auth/signin/twitter?callbackUrl=https%3A%2F%2Fx.com%2Fsecret&debug=world",
    );

    installEarlyGuard();

    expect(window.location.pathname).toBe("/");
    expect(window.location.search).toBe("?debug=world");
    expect(earlyWindow().__veripostEarlyBlockedNavigations).toEqual([
      {
        trigger: "early_legacy_auth_recovery",
        target: "http://localhost:3000/api/auth/signin/twitter?...",
      },
    ]);
    expect(beaconPayloads).toHaveLength(1);
    const payload = JSON.parse(await (beaconPayloads[0].data as Blob).text()) as {
      errorMessage: string;
      event: string;
      phase: string;
    };
    expect(payload).toEqual(expect.objectContaining({
      event: "world_external_navigation_blocked",
      phase: "loading",
      errorMessage: "Blocked early_legacy_auth_recovery navigation to http://localhost:3000/api/auth/signin/twitter?... before React hydration.",
    }));
    expect(JSON.stringify(payload)).not.toContain("callbackUrl");
    expect(JSON.stringify(payload)).not.toContain("secret");
  });

  it("normalizes stale mini app and root handoff URLs before React hydration", () => {
    window.history.replaceState(null, "", "/world-miniapp?debug=world");

    installEarlyGuard();

    expect(window.location.pathname).toBe("/");
    expect(window.location.search).toBe("?debug=world");
    expect(earlyWindow().__veripostEarlyBlockedNavigations).toEqual([
      {
        trigger: "early_legacy_miniapp_recovery",
        target: "http://localhost:3000/world-miniapp?...",
      },
    ]);

    earlyWindow().__veripostEarlyNavigationGuardCleanup?.();
    Reflect.deleteProperty(window, "__veripostEarlyBlockedNavigations");
    window.history.replaceState(null, "", "/?path=%2Fapi%2Fauth%2Fsignin%2Ftwitter&debug=world");

    installEarlyGuard();

    expect(window.location.pathname).toBe("/");
    expect(window.location.search).toBe("?debug=world");
    expect(earlyWindow().__veripostEarlyBlockedNavigations).toEqual([
      {
        trigger: "early_legacy_auth_recovery",
        target: "http://localhost:3000/?...",
      },
    ]);
  });

  it("blocks stale same-origin auth anchors before React hydration", () => {
    installEarlyGuard();

    const anchor = document.createElement("a");
    anchor.href = "/proof-session/nonce?return_to=https%3A%2F%2Fx.com";
    document.body.append(anchor);

    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    anchor.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(earlyWindow().__veripostEarlyBlockedNavigations).toEqual([
      {
        trigger: "early_anchor",
        target: "http://localhost:3000/proof-session/nonce?...",
      },
    ]);
  });

  it("blocks common stale SIWE, IDKit, RP, and nonce anchors before React hydration", () => {
    installEarlyGuard();

    for (const href of [
      "/api/nonce",
      "/api/authenticate",
      "/api/authorize",
      "/api/sign-in",
      "/api/log_in",
      "/api/complete-siwe",
      "/api/idkit",
      "/api/rp-signature",
      "/api/world-id/verify",
      "/world-miniapp/complete-siwe",
      "/world-miniapp/authenticate",
      "/world-miniapp/authorize",
      "/world-miniapp/idkit",
      "/sign_in",
      "/world/sign-in",
      "/world-auth",
      "/world-miniapp",
      "/world",
    ]) {
      const anchor = document.createElement("a");
      anchor.href = href;
      document.body.append(anchor);

      const click = new MouseEvent("click", { bubbles: true, cancelable: true });
      anchor.dispatchEvent(click);

      expect(click.defaultPrevented, href).toBe(true);
    }

    expect(earlyWindow().__veripostEarlyBlockedNavigations).toEqual([
      {
        trigger: "early_anchor",
        target: "http://localhost:3000/api/nonce",
      },
      {
        trigger: "early_anchor",
        target: "http://localhost:3000/api/authenticate",
      },
      {
        trigger: "early_anchor",
        target: "http://localhost:3000/api/authorize",
      },
      {
        trigger: "early_anchor",
        target: "http://localhost:3000/api/sign-in",
      },
      {
        trigger: "early_anchor",
        target: "http://localhost:3000/api/log_in",
      },
      {
        trigger: "early_anchor",
        target: "http://localhost:3000/api/complete-siwe",
      },
      {
        trigger: "early_anchor",
        target: "http://localhost:3000/api/idkit",
      },
      {
        trigger: "early_anchor",
        target: "http://localhost:3000/api/rp-signature",
      },
      {
        trigger: "early_anchor",
        target: "http://localhost:3000/api/world-id/verify",
      },
      {
        trigger: "early_anchor",
        target: "http://localhost:3000/world-miniapp/complete-siwe",
      },
      {
        trigger: "early_anchor",
        target: "http://localhost:3000/world-miniapp/authenticate",
      },
      {
        trigger: "early_anchor",
        target: "http://localhost:3000/world-miniapp/authorize",
      },
      {
        trigger: "early_anchor",
        target: "http://localhost:3000/world-miniapp/idkit",
      },
      {
        trigger: "early_anchor",
        target: "http://localhost:3000/sign_in",
      },
      {
        trigger: "early_anchor",
        target: "http://localhost:3000/world/sign-in",
      },
      {
        trigger: "early_anchor",
        target: "http://localhost:3000/world-auth",
      },
      {
        trigger: "early_anchor",
        target: "http://localhost:3000/world-miniapp",
      },
      {
        trigger: "early_anchor",
        target: "http://localhost:3000/world",
      },
    ]);
  });

  it("blocks combined stale auth alias anchors before React hydration", () => {
    installEarlyGuard();

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
      const anchor = document.createElement("a");
      anchor.href = href;
      document.body.append(anchor);

      const click = new MouseEvent("click", { bubbles: true, cancelable: true });
      anchor.dispatchEvent(click);

      expect(click.defaultPrevented, href).toBe(true);
    }

    expect(earlyWindow().__veripostEarlyBlockedNavigations).toEqual(hrefs.map((href) => ({
      trigger: "early_anchor",
      target: `http://localhost:3000${href}`,
    })));
  });

  it("blocks stale root query handoff anchors before React hydration", () => {
    installEarlyGuard();

    for (const href of [
      "/?path=%2Fapi%2Fauth%2Fsignin%2Ftwitter",
      "/?redirect_uri=https%3A%2F%2Fx.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret",
      "/?returnTo=worldapp%3A%2F%2Fmini-app%3Fapp_id%3Dsecret",
      "/?path=https%3A%2F%2Fworldcoin.org%2Fverify%3Fapp_id%3Dsecret",
      "/?url=https%3A%2F%2Fauth.example.com%2Foauth%3Ftoken%3Dsecret",
      "/?returnUrl=worldapp%3A%2F%2Fmini-app%3Fapp_id%3Dsecret",
      "/?redirect_to=https%3A%2F%2Fx.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret",
      "/?continue=https%3A%2F%2Fauth.example.com%2Foauth%3Ftoken%3Dsecret",
      "/?target=https%3A%2F%2Fworld.org%2Fmini-app%3Fapp_id%3Dsecret",
      "/?state=https%3A%2F%2Fworldcoin.org%2Fverify%3Frequest_id%3Dsecret",
      "/?oauth_callback=https%3A%2F%2Fx.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret",
      "/?deep_link=worldapp%3A%2F%2Fmini-app%3Fapp_id%3Dsecret",
      "/?fallback=%2Fapi%2Fauth%2Fsignin%2Ftwitter",
      "/?launch=https%3A%2F%2Fworld.org%2Fmini-app%3Fapp_id%3Dsecret",
      "/?fallback=api%2Fauth%2Fsignin%2Ftwitter",
      "/?oauth_callback=x.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret",
      "/?launch=world.org%2Fmini-app%3Fapp_id%3Dsecret",
      "/?oauth_path=oauth2%2Fauthorize%3Fclient_id%3Dsecret",
      "/?callbackUrl=",
      "/?auth",
      "/?authenticate=true",
      "/?authorize=true",
      "/?logIn=true",
      "/?sign_in=true",
      "/?loginWithX=true",
      "/?oauth_callback=stale",
      "/?worldSignIn=true",
      "/?xLogin=true",
      "/?walletAuth=",
      "/?world_wallet_auth=true",
    ]) {
      const anchor = document.createElement("a");
      anchor.href = href;
      document.body.append(anchor);

      const click = new MouseEvent("click", { bubbles: true, cancelable: true });
      anchor.dispatchEvent(click);

      expect(click.defaultPrevented, href).toBe(true);
    }

    expect(earlyWindow().__veripostEarlyBlockedNavigations).toEqual(Array.from({ length: 30 }, () => ({
      trigger: "early_anchor",
      target: "http://localhost:3000/?...",
    })));
    expect(JSON.stringify(earlyWindow().__veripostEarlyBlockedNavigations)).not.toContain("client_id");
    expect(JSON.stringify(earlyWindow().__veripostEarlyBlockedNavigations)).not.toContain("app_id");
    expect(JSON.stringify(earlyWindow().__veripostEarlyBlockedNavigations)).not.toContain("request_id");
    expect(JSON.stringify(earlyWindow().__veripostEarlyBlockedNavigations)).not.toContain("worldapp:");
    expect(JSON.stringify(earlyWindow().__veripostEarlyBlockedNavigations)).not.toContain("worldcoin.org");
    expect(JSON.stringify(earlyWindow().__veripostEarlyBlockedNavigations)).not.toContain("world.org");
    expect(JSON.stringify(earlyWindow().__veripostEarlyBlockedNavigations)).not.toContain("auth.example.com");
    expect(JSON.stringify(earlyWindow().__veripostEarlyBlockedNavigations)).not.toContain("token");
  });

  it("blocks stale hash handoff anchors before React hydration", () => {
    installEarlyGuard();

    for (const href of [
      "/#/api/auth/signin/twitter?callbackUrl=https%3A%2F%2Fx.com%2Fsecret",
      "/#?returnTo=worldapp%3A%2F%2Fmini-app%3Fapp_id%3Dsecret",
      "/#https%3A%2F%2Fx.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret",
      "/#https%3A%2F%2Fworldcoin.org%2Fverify%3Fapp_id%3Dsecret",
      "/#?deep_link=worldapp%3A%2F%2Fmini-app%3Fapp_id%3Dsecret",
      "/#?fallback=api%2Fauth%2Fsignin%2Ftwitter",
      "/#?oauth_callback=x.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret",
      "/#fallback=api%2Fauth%2Fsignin%2Ftwitter",
      "/#oauth_callback=x.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret",
    ]) {
      const anchor = document.createElement("a");
      anchor.href = href;
      document.body.append(anchor);

      const click = new MouseEvent("click", { bubbles: true, cancelable: true });
      anchor.dispatchEvent(click);

      expect(click.defaultPrevented, href).toBe(true);
    }

    expect(earlyWindow().__veripostEarlyBlockedNavigations).toEqual(Array.from({ length: 9 }, () => ({
      trigger: "early_anchor",
      target: "http://localhost:3000/?...",
    })));
    expect(JSON.stringify(earlyWindow().__veripostEarlyBlockedNavigations)).not.toContain("client_id");
    expect(JSON.stringify(earlyWindow().__veripostEarlyBlockedNavigations)).not.toContain("app_id");
    expect(JSON.stringify(earlyWindow().__veripostEarlyBlockedNavigations)).not.toContain("worldapp:");
    expect(JSON.stringify(earlyWindow().__veripostEarlyBlockedNavigations)).not.toContain("worldcoin.org");
  });

  it("blocks stale history state handoffs before React hydration", () => {
    installEarlyGuard();

    window.history.pushState(
      null,
      "",
      "/?oauth_callback=x.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret",
    );
    window.history.replaceState(null, "", "/#fallback=api%2Fauth%2Fsignin%2Ftwitter");
    window.history.pushState(null, "", "/proof/vp_123");

    expect(window.location.pathname).toBe("/proof/vp_123");
    expect(earlyWindow().__veripostEarlyBlockedNavigations).toEqual([
      {
        trigger: "early_history_push_state",
        target: "http://localhost:3000/?...",
      },
      {
        trigger: "early_history_replace_state",
        target: "http://localhost:3000/?...",
      },
    ]);
    expect(JSON.stringify(earlyWindow().__veripostEarlyBlockedNavigations)).not.toContain("client_id");
    expect(JSON.stringify(earlyWindow().__veripostEarlyBlockedNavigations)).not.toContain("secret");
  });

  it("keeps early guarded history methods writable for Next router patches", () => {
    installEarlyGuard();
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
  });

  it("recovers direct stale hash mutations before React hydration", () => {
    installEarlyGuard();

    window.history.pushState(null, "", "/proof/vp_123?debug=world");
    window.location.hash = "oauth_callback=x.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret";
    window.dispatchEvent(new Event("hashchange"));

    expect(window.location.pathname).toBe("/proof/vp_123");
    expect(window.location.search).toBe("?debug=world");
    expect(window.location.hash).toBe("");
    expect(earlyWindow().__veripostEarlyBlockedNavigations).toEqual([
      {
        trigger: "early_hashchange",
        target: "http://localhost:3000/proof/vp_123?...",
      },
    ]);
    expect(JSON.stringify(earlyWindow().__veripostEarlyBlockedNavigations)).not.toContain("client_id");
    expect(JSON.stringify(earlyWindow().__veripostEarlyBlockedNavigations)).not.toContain("secret");
  });

  it("blocks external auth window opens without exposing query strings", () => {
    const openedUrls: string[] = [];
    window.open = vi.fn((url?: string | URL) => {
      openedUrls.push(String(url));
      return null;
    });
    installEarlyGuard();

    expect(window.open("https://auth.example.com/oauth?token=secret")).toBeNull();

    expect(openedUrls).toEqual([]);
    expect(earlyWindow().__veripostEarlyBlockedNavigations).toEqual([
      {
        trigger: "early_window_open",
        target: "https://auth.example.com/oauth?...",
      },
    ]);
  });

  it("blocks programmatic external auth form submissions before React hydration", () => {
    installEarlyGuard();

    const form = document.createElement("form");
    form.action = "https://x.com/i/oauth2/authorize?client_id=secret";
    document.body.append(form);

    form.submit();

    expect(earlyWindow().__veripostEarlyBlockedNavigations).toEqual([
      {
        trigger: "early_form_submit_method",
        target: "https://x.com/i/oauth2/authorize?...",
      },
    ]);
  });

  it("blocks beforeunload in a World App surface before React hydration", () => {
    earlyWindow().WorldApp = {
      supported_commands: [
        { name: "verify", supported_versions: [1] },
      ],
    };
    installEarlyGuard();

    const event = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(event.returnValue).toBe("");
    expect(earlyWindow().__veripostEarlyBlockedNavigations).toEqual([
      {
        trigger: "early_beforeunload",
        target: "unknown",
      },
    ]);
  });

  it("allows beforeunload before React hydration outside a World App surface", () => {
    installEarlyGuard();

    const event = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(earlyWindow().__veripostEarlyBlockedNavigations).toBeUndefined();
  });

  it("reports blocked pre-hydration navigation with redacted diagnostics", async () => {
    const beaconPayloads: Array<{ data: BodyInit | null; url: string }> = [];
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      value: vi.fn((url: string, data: BodyInit | null) => {
        beaconPayloads.push({ url, data });
        return true;
      }),
    });
    earlyWindow().WorldApp = {
      world_app_version: 4001012,
    };
    earlyWindow().webkit = {
      messageHandlers: {
        miniKit: {
          postMessage: () => undefined,
        },
      },
    };
    installEarlyGuard();

    const anchor = document.createElement("a");
    anchor.href = "/api/auth/signin/twitter?callbackUrl=https%3A%2F%2Fx.com%2Fsecret";
    document.body.append(anchor);

    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    anchor.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(beaconPayloads).toHaveLength(2);
    expect(beaconPayloads[0].url).toBe("/api/runtime-diagnostics");

    const payloads = await readBeaconPayloads(beaconPayloads);
    expect(payloads[0]).toEqual(expect.objectContaining({
      event: "world_runtime_initial",
      phase: "loading",
    }));
    expect(payloads[0].diagnostics).toEqual(expect.objectContaining({
      nativeTransport: true,
      walletAddress: "missing",
      worldAppRuntime: true,
    }));
    const payload = payloads[1];
    expect(payload).toEqual(expect.objectContaining({
      event: "world_external_navigation_blocked",
      phase: "loading",
      sessionId: expect.stringMatching(/^[a-z0-9-]{8,80}$/i),
      errorMessage: "Blocked early_anchor navigation to http://localhost:3000/api/auth/signin/twitter?... before React hydration.",
    }));
    expect(payload.diagnostics).toEqual(expect.objectContaining({
      nativeTransport: true,
      walletAddress: "missing",
      worldAppRuntime: true,
    }));
    expect(JSON.stringify(payload)).not.toContain("secret");
    expect(JSON.stringify(payload)).not.toContain("callbackUrl=");
    expect(JSON.stringify(payload)).not.toContain("0x");
  });

  it("reports blocked pre-hydration navigation on alternate Android native bridge surfaces", async () => {
    const beaconPayloads: Array<{ data: BodyInit | null; url: string }> = [];
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      value: vi.fn((url: string, data: BodyInit | null) => {
        beaconPayloads.push({ url, data });
        return true;
      }),
    });
    earlyWindow().ReactNativeWebView = {
      postMessage: () => undefined,
    };
    installEarlyGuard();

    const anchor = document.createElement("a");
    anchor.href = "/api/auth/signin/twitter?callbackUrl=https%3A%2F%2Fx.com%2Fsecret";
    document.body.append(anchor);

    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    anchor.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(beaconPayloads).toHaveLength(1);
    const payload = JSON.parse(await (beaconPayloads[0].data as Blob).text()) as {
      diagnostics: {
        nativeTransport: boolean;
        worldAppRuntime: boolean;
      };
    };
    expect(payload.diagnostics).toEqual(expect.objectContaining({
      nativeTransport: true,
      worldAppRuntime: false,
    }));
  });

  it("allows explicit post-proof X intent when the compose flow enables it", () => {
    const openedUrls: string[] = [];
    window.open = vi.fn((url?: string | URL) => {
      openedUrls.push(String(url));
      return null;
    });
    earlyWindow().__veripostAllowPostProofNavigation = true;
    installEarlyGuard();

    window.open("https://x.com/intent/tweet?text=hello");

    expect(openedUrls).toEqual(["https://x.com/intent/tweet?text=hello"]);
    expect(earlyWindow().__veripostEarlyBlockedNavigations).toBeUndefined();
  });
});
