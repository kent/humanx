import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/runtime-diagnostics/route";
import { resetRateLimitsForTests } from "@/lib/rate-limit";

type RuntimeDiagnosticEvent = {
  event:
    | "world_account_context_detected"
    | "world_account_context_pending"
    | "world_account_check_started"
    | "world_external_navigation_blocked"
    | "world_idkit_connector_blocked"
    | "world_idkit_native_failed"
    | "world_idkit_native_started"
    | "world_proof_ready"
    | "world_proof_request_started"
    | "world_runtime_error"
    | "world_runtime_initial"
    | "world_runtime_loaded"
    | "world_runtime_pagehide"
    | "world_runtime_visibility_hidden";
  sessionId?: string;
  errorMessage?: string;
  phase: "creating_proof" | "error" | "loading" | "proof_ready" | "ready" | "verifying_world";
  diagnostics: {
    flowVersion: string;
    worldAppRuntime: boolean;
    nativeTransport: boolean;
    worldAppUserAgent: boolean;
    walletAddress: "present" | "missing";
    accountSource: "world_app" | "minikit" | "wallet_provider" | "missing";
    accountSourceDetail?:
      | "world_app_flat"
      | "world_app_user"
      | "world_app_account"
      | "world_app_wallet"
      | "world_app_user_account"
      | "world_app_user_wallet"
      | "world_app_message"
      | "minikit"
      | "wallet_provider"
      | "missing";
    orbVerified: boolean | null;
    worldAppVersion: number | null;
    deviceOS: string | null;
    launchLocation: string | null;
    openOrigin: string | null;
    miniKitBridge: {
      trigger: boolean;
      subscribe: boolean;
      unsubscribe: boolean;
    };
    worldAppInit: {
      attempted: boolean;
      success: boolean | null;
      attempts: number;
      transport: "android" | "ios" | "missing";
      stateContainer: "created" | "existing" | "skipped" | "missing";
      errorCode: string | null;
      errorMessage: string | null;
    };
    worldAppKeys: string[];
    worldAppShapeKeys?: string[];
    miniKitUserKeys: string[];
  };
};

function validDiagnosticEvent(): RuntimeDiagnosticEvent {
  return {
    event: "world_runtime_error",
    sessionId: "runtime-session-1234",
    errorMessage: "World App did not expose your logged-in account.",
    phase: "error",
    diagnostics: {
      flowVersion: "world-miniapp-idkit-native-2026-06-01",
      worldAppRuntime: true,
      nativeTransport: true,
      worldAppUserAgent: true,
      walletAddress: "present",
      accountSource: "minikit",
      accountSourceDetail: "minikit",
      orbVerified: true,
      worldAppVersion: 2,
      deviceOS: "ios",
      launchLocation: "app-store",
      openOrigin: "https://world.org",
      miniKitBridge: {
        trigger: true,
        subscribe: true,
        unsubscribe: true,
      },
      worldAppInit: {
        attempted: false,
        success: null,
        attempts: 0,
        transport: "missing",
        stateContainer: "missing",
        errorCode: null,
        errorMessage: null,
      },
      worldAppKeys: ["wallet_address", "world_app_version"],
      worldAppShapeKeys: ["WorldApp.wallet_address", "WorldApp.world_app_version"],
      miniKitUserKeys: ["walletAddress", "verificationStatus"],
    },
  };
}

function diagnosticsRequest(body: unknown, headers: HeadersInit = {}): Request {
  return new Request("https://veripost.io/api/runtime-diagnostics", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://veripost.io",
      "user-agent": "WorldApp iPhone",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  resetRateLimitsForTests();
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.VERCEL_ENV;
  delete process.env.WORLD_ID_ENVIRONMENT;
});

describe("World runtime diagnostics endpoint", () => {
  it("logs only the redacted runtime diagnostic envelope", async () => {
    const response = await POST(diagnosticsRequest(validDiagnosticEvent()));

    expect(response.status).toBe(204);
    await expect(response.text()).resolves.toBe("");

    expect(console.info).toHaveBeenCalledTimes(1);
    const [, serializedEvent] = vi.mocked(console.info).mock.calls[0] as [string, string];
    const loggedEvent = JSON.parse(serializedEvent) as RuntimeDiagnosticEvent & {
      receivedAt: string;
      request: { userAgent: { worldApp: boolean; ios: boolean; mobile: boolean } };
    };

    expect(loggedEvent).toMatchObject(validDiagnosticEvent());
    expect(loggedEvent.receivedAt).toEqual(expect.any(String));
    expect(loggedEvent.request.userAgent).toMatchObject({
      worldApp: true,
      ios: true,
      mobile: true,
    });
    expect(serializedEvent).not.toContain("0x");
    expect(serializedEvent).not.toContain("WorldApp iOS");
    expect(serializedEvent).not.toContain("draftText");
    expect(serializedEvent).not.toContain("worldAppAccount");
    expect(serializedEvent).not.toContain("tweetIntentUrl");
    expect(serializedEvent).not.toContain("0x1111111111111111111111111111111111111111");
    expect(loggedEvent.sessionId).toBe("runtime-session-1234");
  });

  it("accepts one-time loaded diagnostics without an error message", async () => {
    const loadedEvent = {
      ...validDiagnosticEvent(),
      event: "world_runtime_loaded",
      phase: "ready",
      errorMessage: undefined,
    };

    const response = await POST(diagnosticsRequest(loadedEvent));

    expect(response.status).toBe(204);
    expect(console.info).toHaveBeenCalledTimes(1);
    const [, serializedEvent] = vi.mocked(console.info).mock.calls[0] as [string, string];
    expect(serializedEvent).toContain("world_runtime_loaded");
    expect(serializedEvent).not.toContain("0x");
  });

  it("keeps accepting older diagnostics that omit init retry metadata", async () => {
    const legacyLoadedEvent = {
      ...validDiagnosticEvent(),
      event: "world_runtime_loaded",
      phase: "ready",
      errorMessage: undefined,
      diagnostics: {
        ...validDiagnosticEvent().diagnostics,
        worldAppInit: {
          attempted: true,
          success: true,
          errorCode: null,
          errorMessage: null,
        },
      },
    };

    const response = await POST(diagnosticsRequest(legacyLoadedEvent));

    expect(response.status).toBe(204);
    const [, serializedEvent] = vi.mocked(console.info).mock.calls[0] as [string, string];
    expect(serializedEvent).toContain('"attempts":0');
    expect(serializedEvent).toContain('"transport":"missing"');
    expect(serializedEvent).toContain('"stateContainer":"missing"');
  });

  it("accepts native IDKit lifecycle diagnostics without exposing account data", async () => {
    for (const event of [
      "world_account_context_detected",
      "world_account_context_pending",
      "world_account_check_started",
      "world_external_navigation_blocked",
      "world_idkit_connector_blocked",
      "world_idkit_native_failed",
      "world_idkit_native_started",
      "world_proof_ready",
      "world_proof_request_started",
      "world_runtime_pagehide",
      "world_runtime_visibility_hidden",
    ] as const) {
      vi.mocked(console.info).mockClear();
      const accountEvent = {
        ...validDiagnosticEvent(),
        event,
        phase: (
            event === "world_account_context_detected" ||
            event === "world_account_context_pending"
          )
          ? "ready"
            : event === "world_proof_ready"
              ? "proof_ready"
              : event === "world_idkit_connector_blocked" ||
                  event === "world_idkit_native_failed"
                ? "error"
            : event === "world_account_check_started" ||
              event === "world_external_navigation_blocked" ||
              event === "world_idkit_native_started" ||
              event === "world_runtime_pagehide" ||
              event === "world_runtime_visibility_hidden"
            ? "verifying_world"
            : "creating_proof",
        errorMessage: undefined,
      };

      const response = await POST(diagnosticsRequest(accountEvent));

      expect(response.status).toBe(204);
      expect(console.info).toHaveBeenCalledTimes(1);
      const [, serializedEvent] = vi.mocked(console.info).mock.calls[0] as [string, string];
      expect(serializedEvent).toContain(event);
      expect(serializedEvent).not.toContain("0x");
      expect(serializedEvent).not.toContain("worldAppAccount");
      expect(serializedEvent).not.toContain("draftText");
      expect(serializedEvent).not.toContain("signature");
    }
  });

  it("accepts initial diagnostics from mobile webviews that omit origin headers", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://veripost.io";
    const initialEvent = {
      ...validDiagnosticEvent(),
      event: "world_runtime_initial",
      phase: "loading",
      errorMessage: undefined,
    };

    const response = await POST(
      diagnosticsRequest(initialEvent, {
        origin: "",
        referer: "",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) WorldApp",
      }),
    );

    expect(response.status).toBe(204);
    const [, serializedEvent] = vi.mocked(console.info).mock.calls[0] as [string, string];
    const loggedEvent = JSON.parse(serializedEvent) as { request: { provenance: { origin: string }; userAgent: { worldApp: boolean; ios: boolean; mobile: boolean } } };
    expect(loggedEvent.request.provenance.origin).toBe("missing");
    expect(loggedEvent.request.userAgent).toMatchObject({
      worldApp: true,
      ios: true,
      mobile: true,
    });
    expect(serializedEvent).not.toContain("Mozilla");
  });

  it("rejects unused command lifecycle diagnostics", async () => {
    const commandEvent = {
      ...validDiagnosticEvent(),
      event: "native_command_start",
      phase: "verifying_world",
      errorMessage: undefined,
      commandPayload: {
        nativeWorldApp: true,
        commandName: "present",
        commandVersion: 2,
      },
    };

    const response = await POST(diagnosticsRequest(commandEvent));

    expect(response.status).toBe(400);
    expect(console.info).not.toHaveBeenCalled();
  });

  it("requires an error message for error diagnostics", async () => {
    const errorEvent = {
      ...validDiagnosticEvent(),
      errorMessage: undefined,
    };

    const response = await POST(diagnosticsRequest(errorEvent));

    expect(response.status).toBe(400);
    expect(console.info).not.toHaveBeenCalled();
  });

  it("rejects raw wallet and draft fields instead of logging them", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://veripost.io";
    const unsafePayload = {
      ...validDiagnosticEvent(),
      draftText: "private text",
      commandPayload: {
        nativeWorldApp: true,
        commandName: "present",
        commandVersion: 2,
        address: "0x1111111111111111111111111111111111111111",
      },
      diagnostics: {
        ...validDiagnosticEvent().diagnostics,
        wallet_address: "0x1111111111111111111111111111111111111111",
      },
    };

    const response = await POST(diagnosticsRequest(unsafePayload));
    const payload = (await response.json()) as { error: { details?: unknown } };

    expect(response.status).toBe(400);
    expect(payload.error.details).toBeUndefined();
    expect(console.info).not.toHaveBeenCalled();
  });

  it("uses the shared same-origin and size guards", async () => {
    const crossOriginResponse = await POST(
      diagnosticsRequest(validDiagnosticEvent(), { origin: "https://evil.example" }),
    );
    expect(crossOriginResponse.status).toBe(403);

    const oversizedResponse = await POST(
      diagnosticsRequest(validDiagnosticEvent(), { "content-length": "16385" }),
    );
    expect(oversizedResponse.status).toBe(413);
    expect(console.info).not.toHaveBeenCalled();
  });
});
