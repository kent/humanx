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

const draftText = "Posting with logged-in World App account";
const worldAppAddress = "0x1111111111111111111111111111111111111111";
const providerAddress = "0x2222222222222222222222222222222222222222";
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
  ethereum?: {
    selectedAddress?: string;
    request?: (payload: unknown) => Promise<unknown>;
  };
  WorldApp?: unknown;
  MiniKit?: unknown;
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
  delete browserWindow.ethereum;
  delete browserWindow.WorldApp;
  delete browserWindow.MiniKit;
  delete browserWindow.webkit;
});

describe("ComposeFlow native IDKit path without wallet permission commands", () => {
  it("uses World App proof runtime without requesting wallet permissions", async () => {
    const container = document.createElement("div");
    const ethereumRequest = vi.fn(async () => []);
    const diagnosticEvents: Array<{
      event?: string;
      diagnostics?: {
        accountSource?: string;
        accountSourceDetail?: string;
        nativeTransport?: boolean;
        walletAddress?: string;
      };
    }> = [];
    const proofRequests: ProofRequest[] = [];
    const nativeMessages: unknown[] = [];
    const visitedUrls: string[] = [];
    document.body.append(container);

    const browserWindow = window as BrowserWindow;
    browserWindow.ethereum = {
      selectedAddress: providerAddress,
      request: ethereumRequest,
    };
    browserWindow.WorldApp = {
      world_app_version: 4001012,
      device_os: "ios",
      supported_commands: worldAppSupportedCommands(),
      location: {
        open_origin: "app-store",
      },
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
      expect(diagnosticEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({
          event: "world_account_context_detected",
          diagnostics: expect.objectContaining({
            accountSource: "wallet_provider",
            accountSourceDetail: "wallet_provider",
            nativeTransport: true,
            walletAddress: "present",
          }),
        }),
      ]));
    });

    await enterDraftAndPost(container);

    await waitFor(() => {
      expect(proofRequests).toHaveLength(1);
      expect(container.textContent).toContain("Proof ready. Post to X when you are ready.");
    });

    expect(visitedUrls).toEqual([]);
    expect(ethereumRequest).not.toHaveBeenCalled();
    expect(nativeMessages).toEqual([]);
    expect(proofRequests[0]).toEqual(expect.objectContaining({
      headers: expect.objectContaining({
        "x-veripost-world-app-flow": "idkit-native",
      }),
      body: expect.objectContaining({
        draftText,
        idkitResponse,
      }),
    }));
    expect(requestNativeWorldIdKitProofMock).toHaveBeenCalledWith(expect.objectContaining({
      signal: expect.stringMatching(/^veripost:v1:/),
    }));
    expect(JSON.stringify(nativeMessages)).not.toContain("sign-message");
  });

  it("uses native IDKit when verify commands are advertised", async () => {
    const container = document.createElement("div");
    const proofRequests: ProofRequest[] = [];
    const nativeMessages: unknown[] = [];
    const visitedUrls: string[] = [];
    document.body.append(container);

    const browserWindow = window as BrowserWindow;
    browserWindow.WorldApp = {
      wallet_address: worldAppAddress,
      world_app_version: 4001012,
      device_os: "ios",
      verification_status: {
        is_orb_verified: true,
      },
      supported_commands: [
        ...worldAppSupportedCommands(),
        { name: "verify", supported_versions: [2] },
      ],
      location: {
        open_origin: "app-store",
      },
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

    vi.spyOn(window.location, "assign").mockImplementation((url) => {
      visitedUrls.push(String(url));
    });
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      value: vi.fn(() => false),
    });
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
    expect(JSON.stringify(nativeMessages)).not.toContain("sign-message");
  });
});

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
  proofRequests: ProofRequest[];
  diagnosticEvents?: Array<Record<string, unknown>>;
}): void {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.origin);

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
      options.proofRequests.push({
        headers: Object.fromEntries(new Headers(init?.headers).entries()),
        body: JSON.parse(String(init?.body)) as ProofRequest["body"],
      });

      const proofUrl = `${window.location.origin}/proof/vp_account`;
      return jsonResponse({
        proof: {
          id: "vp_account",
          draftText,
          createdAt: "2026-05-31T11:55:00.000Z",
          proofCommitment: "a".repeat(64),
        },
        proofUrl,
        tweetIntentUrl: buildXIntentUrl(draftText, proofUrl),
        createdNew: true,
      });
    }

    throw new Error(`Unexpected fetch: ${url.pathname}`);
  }));
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
