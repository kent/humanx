// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ComposeFlow from "@/components/compose-flow";
import { buildXIntentUrl } from "@/lib/x";

const requestNativeWorldIdKitProofMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/world-idkit-client", () => ({
  getWorldIdKitClientErrorCode: (error: unknown) => {
    const code = error && typeof error === "object" ? (error as { code?: unknown }).code : null;
    return typeof code === "string" && code.startsWith("world_idkit_") ? code : null;
  },
  requestNativeWorldIdKitProof: requestNativeWorldIdKitProofMock,
}));

const worldAppAddress = "0x1111111111111111111111111111111111111111";
const draftText = "Posting from the World App mini app";
const idkitResponse = {
  protocol_version: "4.0",
  nonce: "0x2222222222222222222222222222222222222222222222222222222222222222",
  action: "veripost-tweet-proof",
  environment: "production",
  user_presence_completed: true,
  responses: [{
    identifier: "proof_of_human",
    signal_hash: "0x3333333333333333333333333333333333333333333333333333333333333333",
    nullifier: "0x1111111111111111111111111111111111111111111111111111111111111111",
  }],
};

type BrowserWindow = typeof window & {
  MiniKit?: unknown;
  miniKit?: unknown;
  WorldApp?: {
    wallet_address?: string;
    world_app_version?: number;
    device_os?: string;
    verification_status?: {
      is_orb_verified?: boolean;
      is_document_verified?: boolean;
      is_secure_document_verified?: boolean;
    };
    location?: {
      open_origin?: string;
    };
    supported_commands?: Array<{ name: string; supported_versions: number[] }>;
  };
  webkit?: {
    messageHandlers?: {
      minikit?: {
        postMessage?: (payload: unknown) => void;
      };
    };
  };
};

type ProofRequest = {
  headers: Record<string, string>;
  body: {
    draftText?: string;
    idkitResponse?: Record<string, unknown>;
  };
};

let root: ReturnType<typeof createRoot> | null = null;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.history.replaceState(null, "", "/");
  window.localStorage.clear();
  document.body.innerHTML = "";
  requestNativeWorldIdKitProofMock.mockReset();
  requestNativeWorldIdKitProofMock.mockResolvedValue(idkitResponse);
});

afterEach(() => {
  root?.unmount();
  root = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();

  const browserWindow = window as BrowserWindow;
  delete browserWindow.MiniKit;
  delete browserWindow.miniKit;
  delete browserWindow.WorldApp;
  delete browserWindow.webkit;
});

describe("ComposeFlow World App IDKit proof path", () => {
  it("uses native IDKit inside World App without opening connector auth", async () => {
    const container = document.createElement("div");
    const proofRequests: ProofRequest[] = [];
    const diagnosticFetchInits: RequestInit[] = [];
    const diagnosticEvents: Array<{
      event?: string;
      phase?: string;
      diagnostics?: {
        accountSource?: string;
        worldAppRuntime?: boolean;
      };
    }> = [];
    const nativeMessages: unknown[] = [];
    const visitedUrls: string[] = [];
    const requestedPaths: string[] = [];
    document.body.append(container);
    window.history.replaceState(null, "", "/?debug=world");

    const browserWindow = window as BrowserWindow;
    browserWindow.WorldApp = worldAppAccountPayload();
    browserWindow.webkit = {
      messageHandlers: {
        minikit: {
          postMessage: (payload) => {
            nativeMessages.push(payload);
          },
        },
      },
    };

    vi.spyOn(window.location, "assign").mockImplementation((url) => {
      visitedUrls.push(String(url));
    });
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      value: vi.fn(() => false),
    });
    stubFetch({ proofRequests, diagnosticEvents, diagnosticFetchInits, requestedPaths });

    await renderCompose(container);

    await waitFor(() => {
      expect(getPostTextArea(container).disabled).toBe(false);
    });

    await act(async () => {
      window.dispatchEvent(new PageTransitionEvent("pagehide"));
    });

    await waitFor(() => {
      expect(diagnosticEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({
          event: "world_runtime_pagehide",
          phase: "ready",
          diagnostics: expect.objectContaining({ worldAppRuntime: true }),
        }),
      ]));
    });
    const pagehideDiagnosticIndex = diagnosticEvents.findIndex((event) => event.event === "world_runtime_pagehide");
    expect(pagehideDiagnosticIndex).toBeGreaterThanOrEqual(0);
    expect(diagnosticFetchInits[pagehideDiagnosticIndex]).toEqual(expect.objectContaining({ keepalive: true }));

    await enterDraftAndPost(container);

    await waitFor(() => {
      expect(proofRequests).toHaveLength(1);
      expect(container.textContent).toContain("Proof ready. Post to X when you are ready.");
      expect(container.textContent).toContain("World proof trace");
      expect(container.textContent).toContain("world_account_check_started");
      expect(container.textContent).toContain("world_account_context_detected");
      expect(container.textContent).toContain("world_idkit_native_started");
      expect(container.textContent).toContain("world_proof_request_started");
      expect(container.textContent).toContain("world_proof_ready");
    });

    expect(visitedUrls).toEqual([]);
    expect(requestedPaths).not.toContain("/api/world-proof/request");
    expect(requestedPaths).toContain("/api/world-proof/rp-context");
    expect(proofRequests[0]).toEqual({
      headers: expect.objectContaining({
        "content-type": "application/json",
        "x-veripost-runtime-session": expect.stringMatching(/^[a-z0-9-]{8,80}$/i),
        "x-veripost-world-app-flow": "idkit-native",
      }),
      body: {
        draftText,
        idkitResponse,
      },
    });
    expect(diagnosticEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        event: "world_account_context_detected",
        phase: "verifying_world",
        diagnostics: expect.objectContaining({
          accountSource: "world_app",
        }),
      }),
      expect.objectContaining({
        event: "world_proof_ready",
        phase: "proof_ready",
      }),
    ]));
    expect(requestNativeWorldIdKitProofMock).toHaveBeenCalledWith(expect.objectContaining({
      action: "veripost-tweet-proof",
      appId: "app_dc56f8eecb48c4d395981ec1ca5c6329",
      environment: "production",
      signal: expect.stringMatching(/^veripost:v1:/),
    }));
    expect(JSON.stringify(proofRequests)).not.toContain("worldIdProof");
    expect(JSON.stringify(proofRequests)).not.toContain("worldAppAccount");
    expect(JSON.stringify(nativeMessages)).not.toContain("verify");
    expect(JSON.stringify(nativeMessages)).not.toContain("sign-message");
    expect(JSON.stringify(nativeMessages)).not.toContain("open-url");
    expect(nativeMessages).toEqual([]);
  });

  it("recovers inside the mini app after a stale auth redirect is trapped", async () => {
    const container = document.createElement("div");
    const proofRequests: ProofRequest[] = [];
    const diagnosticEvents: Array<{ event?: string; errorMessage?: string; phase?: string }> = [];
    const visitedUrls: string[] = [];
    document.body.append(container);
    window.history.replaceState(null, "", "/?legacy-auth=blocked&debug=world");

    (window as BrowserWindow).WorldApp = worldAppAccountPayload();

    vi.spyOn(window.location, "assign").mockImplementation((url) => {
      visitedUrls.push(String(url));
    });
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      value: vi.fn(() => false),
    });
    stubFetch({ proofRequests, diagnosticEvents });

    await renderCompose(container);

    await waitFor(() => {
      expect(getPostTextArea(container).disabled).toBe(false);
      expect(container.textContent).toContain(
        "Recovered from a stale sign-in handoff. VeriPost stayed inside World App and will use your logged-in World App account.",
      );
      expect(diagnosticEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({
          event: "world_external_navigation_blocked",
          errorMessage: "legacy-auth=blocked",
          phase: "loading",
        }),
      ]));
    });

    expect(window.location.search).toBe("?debug=world");

    await enterDraftAndPost(container);

    await waitFor(() => {
      expect(proofRequests).toHaveLength(1);
      expect(container.textContent).toContain("Proof ready. Post to X when you are ready.");
    });

    expect(visitedUrls).toEqual([]);
    expect(proofRequests[0]).toEqual(expect.objectContaining({
      headers: expect.objectContaining({
        "x-veripost-world-app-flow": "idkit-native",
      }),
      body: expect.objectContaining({
        draftText,
        idkitResponse,
      }),
    }));
  });

  it("recovers inside the mini app after a stale exact mini app path is rewritten", async () => {
    const container = document.createElement("div");
    const diagnosticEvents: Array<{ event?: string; errorMessage?: string; phase?: string }> = [];
    document.body.append(container);
    window.history.replaceState(null, "", "/world-miniapp?debug=world");

    (window as BrowserWindow).WorldApp = worldAppAccountPayload();
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      value: vi.fn(() => false),
    });
    stubFetch({ diagnosticEvents });

    await renderCompose(container);

    await waitFor(() => {
      expect(getPostTextArea(container).disabled).toBe(false);
      expect(container.textContent).toContain(
        "Recovered from a stale mini app entry path. VeriPost is using the current in-World-App flow.",
      );
      expect(diagnosticEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({
          event: "world_external_navigation_blocked",
          errorMessage: "legacy-miniapp=rerouted",
          phase: "loading",
        }),
      ]));
    });

    expect(window.location.pathname).toBe("/");
    expect(window.location.search).toBe("?debug=world");
  });

  it("lets Post use native IDKit even when passive account context is missing", async () => {
    const container = document.createElement("div");
    const proofRequests: ProofRequest[] = [];
    const diagnosticEvents: Array<{
      event?: string;
      phase?: string;
      diagnostics?: {
        walletAddress?: string;
        worldAppRuntime?: boolean;
        nativeTransport?: boolean;
      };
    }> = [];
    const nativeMessages: unknown[] = [];
    document.body.append(container);

    const browserWindow = window as BrowserWindow;
    browserWindow.WorldApp = {
      world_app_version: 4001012,
      device_os: "ios",
      location: {
        open_origin: "mini-app-listing",
      },
      supported_commands: worldAppSupportedCommands(),
    };
    browserWindow.webkit = {
      messageHandlers: {
        minikit: {
          postMessage: (payload) => {
            nativeMessages.push(payload);
          },
        },
      },
    };
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      value: vi.fn(() => false),
    });
    stubFetch({ proofRequests, diagnosticEvents });

    await renderCompose(container);

    await waitFor(() => {
      expect(getPostTextArea(container).disabled).toBe(false);
      expect(container.textContent).toContain("Waiting for World App proof runtime.");
      expect(diagnosticEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({
          event: "world_account_context_pending",
          phase: "ready",
          diagnostics: expect.objectContaining({
            walletAddress: "missing",
            worldAppRuntime: true,
            nativeTransport: true,
          }),
        }),
      ]));
    });

    await act(async () => {
      setNativeTextAreaValue(getPostTextArea(container), draftText);
      getPostTextArea(container).dispatchEvent(new InputEvent("input", { bubbles: true }));
    });

    await waitFor(() => {
      expect(getPrimaryButton(container).disabled).toBe(false);
    });

    await act(async () => {
      getPrimaryButton(container).click();
    });

    await waitFor(() => {
      expect(diagnosticEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({
          event: "world_account_check_started",
          phase: "verifying_world",
        }),
      ]));
    });

    await waitFor(() => {
      expect(proofRequests).toHaveLength(1);
      expect(container.textContent).toContain("Proof ready. Post to X when you are ready.");
    }, 2_000);

    expect(proofRequests[0]).toEqual(expect.objectContaining({
      headers: expect.objectContaining({
        "x-veripost-world-app-flow": "idkit-native",
      }),
      body: expect.objectContaining({
        idkitResponse,
      }),
    }));
    expect(diagnosticEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        event: "world_idkit_native_started",
      }),
      expect.objectContaining({
        event: "world_proof_ready",
        phase: "proof_ready",
      }),
    ]));
    expect(nativeMessages).toEqual([
      expect.objectContaining({ command: "init" }),
      expect.objectContaining({ command: "init" }),
    ]);
    expect(JSON.stringify(nativeMessages)).not.toContain("wallet-auth");
    expect(JSON.stringify(nativeMessages)).not.toContain("sign-message");
    expect(JSON.stringify(nativeMessages)).not.toContain("sign-typed-data");
  });

  it("fails inline without leaving the mini app when native IDKit runtime is unavailable", async () => {
    const container = document.createElement("div");
    const proofRequests: ProofRequest[] = [];
    const diagnosticEvents: Array<{ event?: string; phase?: string; errorMessage?: string }> = [];
    document.body.append(container);
    requestNativeWorldIdKitProofMock.mockRejectedValueOnce(Object.assign(
      new Error("World App did not expose the in-app World ID proof runtime."),
      { code: "world_idkit_native_unavailable" },
    ));

    stubFetch({ proofRequests, diagnosticEvents });

    await renderCompose(container);

    await waitFor(() => {
      expect(container.textContent).toContain("Open VeriPost from its World App mini app listing.");
      expect(getPostTextArea(container).disabled).toBe(false);
    });

    await act(async () => {
      setNativeTextAreaValue(getPostTextArea(container), draftText);
      getPostTextArea(container).dispatchEvent(new InputEvent("input", { bubbles: true }));
    });

    await waitFor(() => {
      expect(getPrimaryButton(container).disabled).toBe(false);
    });

    await act(async () => {
      getPrimaryButton(container).click();
    });

    await waitFor(() => {
      expect(diagnosticEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({
          event: "world_account_check_started",
          phase: "verifying_world",
        }),
      ]));
    });

    await waitFor(() => {
      expect(proofRequests).toHaveLength(0);
      expect(container.textContent).toContain("World App did not expose the in-app World ID proof runtime.");
    }, 2_000);

    expect(diagnosticEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        event: "world_idkit_native_failed",
        phase: "error",
      }),
    ]));
    expect(window.location.href).not.toContain("world.org/mini-app");
    expect(window.location.href).not.toContain("/api/auth");
  });

  it("cleans stale auth handoffs passed through root query parameters or fragments", async () => {
    const rootQueryContainer = document.createElement("div");
    const queryDiagnostics: Array<{ event?: string; errorMessage?: string; phase?: string }> = [];
    document.body.append(rootQueryContainer);
    window.history.replaceState(
      null,
      "",
      "/?fallback=api%2Fauth%2Fsignin%2Ftwitter&oauth_callback=x.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret&auth&debug=world",
    );
    (window as BrowserWindow).WorldApp = worldAppAccountPayload();
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      value: vi.fn(() => false),
    });
    stubFetch({ diagnosticEvents: queryDiagnostics });

    await renderCompose(rootQueryContainer);

    await waitFor(() => {
      expect(getPostTextArea(rootQueryContainer).disabled).toBe(false);
      expect(queryDiagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({
          event: "world_external_navigation_blocked",
          errorMessage: "legacy-auth=blocked",
          phase: "loading",
        }),
      ]));
    });
    expect(window.location.pathname).toBe("/");
    expect(window.location.search).toBe("?debug=world");

    root?.unmount();
    root = null;
    document.body.innerHTML = "";

    const fragmentContainer = document.createElement("div");
    const fragmentDiagnostics: Array<{ event?: string; errorMessage?: string; phase?: string }> = [];
    document.body.append(fragmentContainer);
    window.history.replaceState(
      null,
      "",
      "/?debug=world#fallback=api%2Fauth%2Fsignin%2Ftwitter&oauth_callback=x.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret",
    );
    (window as BrowserWindow).WorldApp = worldAppAccountPayload();
    stubFetch({ diagnosticEvents: fragmentDiagnostics });

    await renderCompose(fragmentContainer);

    await waitFor(() => {
      expect(getPostTextArea(fragmentContainer).disabled).toBe(false);
      expect(fragmentDiagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({
          event: "world_external_navigation_blocked",
          errorMessage: "legacy-auth=blocked",
          phase: "loading",
        }),
      ]));
    });
    expect(window.location.pathname).toBe("/");
    expect(window.location.search).toBe("?debug=world");
    expect(window.location.hash).toBe("");
  });

  it("posts with native IDKit proof result without using wallet permission commands", async () => {
    const container = document.createElement("div");
    const proofRequests: ProofRequest[] = [];
    document.body.append(container);

    (window as BrowserWindow).WorldApp = worldAppAccountPayload();
    stubFetch({ proofRequests });

    await renderCompose(container);

    await waitFor(() => {
      expect(getPostTextArea(container).disabled).toBe(false);
    });

    await enterDraftAndPost(container);

    await waitFor(() => {
      expect(proofRequests).toHaveLength(1);
      expect(container.textContent).toContain("Proof ready. Post to X when you are ready.");
    });

    expect(proofRequests[0]).toEqual(expect.objectContaining({
      headers: expect.objectContaining({
        "x-veripost-world-app-flow": "idkit-native",
      }),
      body: expect.objectContaining({
        idkitResponse,
      }),
    }));
  });

  it("keeps checking the World account when a stale auth navigation is blocked during proof creation", async () => {
    const container = document.createElement("div");
    const proofRequests: ProofRequest[] = [];
    const diagnosticEvents: Array<{ event?: string; errorMessage?: string; phase?: string }> = [];
    const visitedUrls: string[] = [];
    let resolveProof: ((value: Response) => void) | null = null;
    document.body.append(container);
    window.history.replaceState(null, "", "/?debug=world");

    (window as BrowserWindow).WorldApp = worldAppAccountPayload();
    vi.spyOn(window.location, "assign").mockImplementation((url) => {
      visitedUrls.push(String(url));
    });
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      value: vi.fn(() => false),
    });
    stubFetch({
      proofRequests,
      diagnosticEvents,
      proofResponder: () => new Promise<Response>((resolve) => {
        resolveProof = resolve;
      }),
    });

    await renderCompose(container);

    await waitFor(() => {
      expect(getPostTextArea(container).disabled).toBe(false);
    });

    await enterDraftAndPost(container);

    await waitFor(() => {
      expect(getPrimaryButton(container).textContent).toContain("Creating proof");
    });

    await act(async () => {
      window.open("/world/wallet-auth/nonce");
    });

    await waitFor(() => {
      expect(container.textContent).toContain(
        "Blocked an external navigation. VeriPost stayed inside World App and kept using your logged-in World App account.",
      );
      expect(diagnosticEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({
          event: "world_external_navigation_blocked",
          errorMessage: "Blocked window_open navigation to http://localhost:3000/world/wallet-auth/nonce while staying inside World App.",
          phase: "creating_proof",
        }),
      ]));
    });

    await act(async () => {
      resolveProof?.(successfulProofResponse("vp_blocked_during_create"));
    });

    await waitFor(() => {
      expect(proofRequests).toHaveLength(1);
      expect(container.textContent).toContain("Proof ready. Post to X when you are ready.");
    }, 2_000);

    expect(visitedUrls).toEqual([]);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(proofRequests[0]).toEqual(expect.objectContaining({
      headers: expect.objectContaining({
        "x-veripost-world-app-flow": "idkit-native",
      }),
      body: expect.objectContaining({
        idkitResponse,
      }),
    }));
  });
});

function worldAppAccountPayload(): NonNullable<BrowserWindow["WorldApp"]> {
  return {
    wallet_address: worldAppAddress,
    world_app_version: 4001012,
    device_os: "ios",
    verification_status: {
      is_orb_verified: true,
      is_document_verified: true,
      is_secure_document_verified: false,
    },
    location: {
      open_origin: "app-store",
    },
    supported_commands: worldAppSupportedCommands(),
  };
}

function worldAppSupportedCommands(): Array<{ name: string; supported_versions: number[] }> {
  return [
    { name: "attestation", supported_versions: [1] },
    { name: "pay", supported_versions: [1] },
    { name: "wallet-auth", supported_versions: [2] },
    { name: "send-transaction", supported_versions: [2] },
    { name: "sign-message", supported_versions: [1] },
    { name: "sign-typed-data", supported_versions: [1] },
    { name: "share-contacts", supported_versions: [1] },
    { name: "request-permission", supported_versions: [1] },
    { name: "get-permissions", supported_versions: [1] },
    { name: "send-haptic-feedback", supported_versions: [1] },
    { name: "share", supported_versions: [1] },
    { name: "chat", supported_versions: [1] },
    { name: "close-miniapp", supported_versions: [1] },
  ];
}

async function renderCompose(container: HTMLElement): Promise<void> {
  await act(async () => {
    root = createRoot(container);
    root.render(createElement(ComposeFlow));
  });
}

async function enterDraftAndPost(container: HTMLElement): Promise<void> {
  await act(async () => {
    setNativeTextAreaValue(getPostTextArea(container), draftText);
    getPostTextArea(container).dispatchEvent(new InputEvent("input", { bubbles: true }));
  });

  await waitFor(() => {
    expect(getPrimaryButton(container).disabled).toBe(false);
  });

  await act(async () => {
    getPrimaryButton(container).click();
  });
}

function stubFetch(options: {
  proofRequests?: ProofRequest[];
  diagnosticEvents?: Array<Record<string, unknown>>;
  diagnosticFetchInits?: RequestInit[];
  requestedPaths?: string[];
  proofResponder?: () => Promise<Response> | Response;
}): void {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.origin);
    options.requestedPaths?.push(url.pathname);

    if (url.pathname === "/api/config") {
      return jsonResponse({
        appId: "app_dc56f8eecb48c4d395981ec1ca5c6329",
        action: "veripost-tweet-proof",
        environment: "production",
        hasWorldConfig: true,
        hasProofStorageConfig: true,
        maxPostTextLength: 220,
      });
    }

    if (url.pathname === "/api/runtime-diagnostics") {
      options.diagnosticEvents?.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      options.diagnosticFetchInits?.push(init ?? {});
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/api/world-proof/rp-context") {
      return jsonResponse({
        rpContext: {
          rp_id: "rp_123",
          nonce: "0x2222222222222222222222222222222222222222222222222222222222222222",
          created_at: 1_800_000_000,
          expires_at: 1_800_000_180,
          signature: "0x" + "4".repeat(130),
        },
      });
    }

    if (url.pathname === "/api/proofs") {
      options.proofRequests?.push({
        headers: Object.fromEntries(new Headers(init?.headers).entries()),
        body: JSON.parse(String(init?.body)) as ProofRequest["body"],
      });

      return options.proofResponder?.() ?? successfulProofResponse("vp_browser");
    }

    throw new Error(`Unexpected fetch: ${url.pathname}`);
  }));
}

function successfulProofResponse(id: string): Response {
  const proofUrl = `${window.location.origin}/proof/${id}`;
  return jsonResponse({
    proof: {
      id,
      draftText,
      createdAt: "2026-05-31T10:20:00.000Z",
      proofCommitment: "a".repeat(64),
    },
    proofUrl,
    tweetIntentUrl: buildXIntentUrl(draftText, proofUrl),
    createdNew: true,
  });
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}

function getPostTextArea(container: HTMLElement): HTMLTextAreaElement {
  const textarea = container.querySelector<HTMLTextAreaElement>("#post-text");
  if (!textarea) throw new Error("Post textarea was not rendered.");
  return textarea;
}

function getPrimaryButton(container: HTMLElement): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>(".primary-button");
  if (!button) throw new Error("Primary post button was not rendered.");
  return button;
}

function setNativeTextAreaValue(textarea: HTMLTextAreaElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  if (!setter) throw new Error("Textarea value setter is unavailable.");
  setter.call(textarea, value);
}

async function waitFor(assertion: () => void, timeoutMs = 1_000): Promise<void> {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }
  }

  throw lastError;
}
