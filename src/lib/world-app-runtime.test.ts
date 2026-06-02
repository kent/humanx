import { afterEach, describe, expect, it, vi } from "vitest";

import { createWorldAppRuntime, type WorldAppWindow } from "@/lib/world-app-runtime";

const worldAppAddress = "0x1111111111111111111111111111111111111111" as const;
const miniKitAddress = "0x2222222222222222222222222222222222222222" as const;
const originalWindow = (globalThis as { window?: unknown }).window;

function asWorldAppWindow(value: Record<string, unknown>): WorldAppWindow {
  return value as unknown as WorldAppWindow;
}

function restoreWindow() {
  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, "window");
    return;
  }

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
  });
}

function worldAppSupportedCommands(): NonNullable<WorldAppWindow["WorldApp"]>["supported_commands"] {
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
    { name: "verify", supported_versions: [1] },
  ];
}

afterEach(() => {
  restoreWindow();
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe("World App runtime account context", () => {
  it("reads the World App account without exposing the wallet address in diagnostics", () => {
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        wallet_address: worldAppAddress,
        world_app_version: 4001000,
        device_os: "ios",
        verification_status: {
          is_orb_verified: true,
          is_document_verified: false,
          is_secure_document_verified: false,
        },
        supported_commands: [
          { name: "open-url", supported_versions: [1] },
          { name: "wallet-auth", supported_versions: [2] },
          { name: "share", supported_versions: [1, 2] },
        ],
        location: {
          open_origin: "mini-app-listing",
        },
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: () => undefined,
          },
        },
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.getWorldAppAccountSource()).toBe("world_app");
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: worldAppAddress,
      world_app_version: 4001000,
      device_os: "ios",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: false,
        is_secure_document_verified: false,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toEqual({
      flowVersion: "world-miniapp-idkit-native-2026-06-01",
      worldAppRuntime: true,
      nativeTransport: true,
      worldAppUserAgent: false,
      walletAddress: "present",
      accountSource: "world_app",
      accountSourceDetail: "world_app_flat",
      orbVerified: true,
      worldAppVersion: 4001000,
      deviceOS: "ios",
      launchLocation: "app-store",
      openOrigin: "mini-app-listing",
      miniKitBridge: {
        trigger: false,
        subscribe: false,
        unsubscribe: false,
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
      worldAppKeys: [
        "device_os",
        "location",
        "supported_commands",
        "verification_status",
        "wallet_address",
        "world_app_version",
      ],
      worldAppShapeKeys: [
        "WorldApp.device_os",
        "WorldApp.location",
        "WorldApp.supported_commands",
        "WorldApp.verification_status",
        "WorldApp.wallet_address",
        "WorldApp.world_app_version",
      ],
      miniKitUserKeys: [],
    });
    expect(JSON.stringify(runtime.getWorldRuntimeDiagnostics())).not.toContain(worldAppAddress);
  });

  it("reads raw World App camelCase account fields when present", () => {
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        walletAddress: worldAppAddress,
        worldAppVersion: 4001003,
        deviceOS: "ios",
        verificationStatus: {
          isOrbVerified: true,
          isDocumentVerified: false,
          isSecureDocumentVerified: true,
        },
        location: {
          openOrigin: "mini-app-listing",
        },
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.getWorldAppAccountSource()).toBe("world_app");
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: worldAppAddress,
      world_app_version: 4001003,
      device_os: "ios",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: false,
        is_secure_document_verified: true,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      walletAddress: "present",
      accountSource: "world_app",
      accountSourceDetail: "world_app_flat",
      orbVerified: true,
      worldAppVersion: 4001003,
      deviceOS: "ios",
      openOrigin: "mini-app-listing",
      worldAppKeys: ["deviceOS", "location", "verificationStatus", "walletAddress", "worldAppVersion"],
    });
  });

  it("reads direct World App global aliases without sending auth commands", () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      worldApp: {
        wallet_address: worldAppAddress,
        world_app_version: 4001014,
        device_os: "ios",
        verification_status: {
          is_orb_verified: true,
        },
        location: {
          open_origin: "deep-link",
        },
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.hasWorldAppRuntime()).toBe(true);
    expect(runtime.getWorldAppAccountSource()).toBe("world_app");
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: worldAppAddress,
      world_app_version: 4001014,
      device_os: "ios",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: undefined,
        is_secure_document_verified: undefined,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppRuntime: true,
      walletAddress: "present",
      accountSource: "world_app",
      accountSourceDetail: "world_app_flat",
      launchLocation: "deep-link",
      openOrigin: "deep-link",
      worldAppShapeKeys: [
        "worldApp.device_os",
        "worldApp.location",
        "worldApp.verification_status",
        "worldApp.wallet_address",
        "worldApp.world_app_version",
      ],
    });
    expect(postMessages).toEqual([]);
  });

  it("reads secondary World ID global aliases when they carry account-shaped state", () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      worldID: {
        user: {
          walletAddress: worldAppAddress,
          verificationStatus: {
            isOrbVerified: true,
          },
        },
        worldAppVersion: 4001034,
        deviceOS: "ios",
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.hasWorldAppRuntime()).toBe(true);
    expect(runtime.getWorldAppAccountSource()).toBe("world_app");
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: worldAppAddress,
      world_app_version: 4001034,
      device_os: "ios",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: undefined,
        is_secure_document_verified: undefined,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppRuntime: true,
      walletAddress: "present",
      accountSource: "world_app",
      accountSourceDetail: "world_app_user",
      worldAppShapeKeys: [
        "worldID.deviceOS",
        "worldID.user",
        "worldID.worldAppVersion",
        "worldID.user.verificationStatus",
        "worldID.user.walletAddress",
      ],
    });
    expect(postMessages).toEqual([]);
  });

  it("ignores unrelated secondary globals that are not account-shaped", () => {
    const nativeWindow = asWorldAppWindow({
      world: {
        location: {
          label: "not World App",
        },
        user: {
          name: "not logged-in account context",
        },
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.hasWorldAppRuntime()).toBe(false);
    expect(runtime.getWorldAppAccountSnapshot()).toBeNull();
    expect(runtime.isInWorldApp()).toBe(false);
  });

  it("normalizes string-like World App runtime fields before creating the account payload", () => {
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        wallet_address: ` ${worldAppAddress} `,
        world_app_version: "4001012",
        device_os: " ios ",
        verification_status: {
          is_orb_verified: "true",
          is_document_verified: "false",
          is_secure_document_verified: "unknown",
        },
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.getWorldAppAccountSource()).toBe("world_app");
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: worldAppAddress,
      world_app_version: 4001012,
      device_os: "ios",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: false,
        is_secure_document_verified: undefined,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      walletAddress: "present",
      accountSource: "world_app",
      accountSourceDetail: "world_app_flat",
      orbVerified: true,
      worldAppVersion: 4001012,
      deviceOS: "ios",
    });
  });

  it("reads nested World App user account fields when the raw payload is not flat", () => {
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        user: {
          walletAddress: worldAppAddress,
          verificationStatus: {
            isOrbVerified: true,
            isDocumentVerified: true,
            isSecureDocumentVerified: false,
          },
        },
        world_app_version: 4001005,
        device_os: "android",
        location: {
          open_origin: "app-store",
        },
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.getWorldAppAccountSource()).toBe("world_app");
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: worldAppAddress,
      world_app_version: 4001005,
      device_os: "android",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: true,
        is_secure_document_verified: false,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      walletAddress: "present",
      accountSource: "world_app",
      accountSourceDetail: "world_app_user",
      orbVerified: true,
      launchLocation: "app-store",
      worldAppKeys: ["device_os", "location", "user", "world_app_version"],
      worldAppShapeKeys: [
        "WorldApp.device_os",
        "WorldApp.location",
        "WorldApp.user",
        "WorldApp.world_app_version",
        "WorldApp.user.verificationStatus",
        "WorldApp.user.walletAddress",
      ],
    });
  });

  it("reads common address fields from nested World App wallet objects", () => {
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        user: {
          wallet: {
            address: worldAppAddress,
            verificationStatus: {
              isOrbVerified: true,
            },
          },
        },
        world_app_version: 4001006,
        device_os: "ios",
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.getWorldAppAccountSource()).toBe("world_app");
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: worldAppAddress,
      world_app_version: 4001006,
      device_os: "ios",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: undefined,
        is_secure_document_verified: undefined,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      walletAddress: "present",
      accountSource: "world_app",
      accountSourceDetail: "world_app_user_wallet",
      worldAppShapeKeys: [
        "WorldApp.device_os",
        "WorldApp.user",
        "WorldApp.world_app_version",
        "WorldApp.user.wallet",
        "WorldApp.user.wallet.address",
        "WorldApp.user.wallet.verificationStatus",
      ],
    });
  });

  it("reads alternative World App account address aliases without sending auth commands", () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        user: {
          account: {
            ethereumAddress: worldAppAddress,
            verificationStatus: {
              isOrbVerified: true,
            },
          },
        },
        world_app_version: 4001013,
        device_os: "ios",
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.getWorldAppAccountSource()).toBe("world_app");
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: worldAppAddress,
      world_app_version: 4001013,
      device_os: "ios",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: undefined,
        is_secure_document_verified: undefined,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      walletAddress: "present",
      accountSource: "world_app",
      accountSourceDetail: "world_app_user_account",
      worldAppShapeKeys: [
        "WorldApp.device_os",
        "WorldApp.user",
        "WorldApp.world_app_version",
        "WorldApp.user.account",
        "WorldApp.user.account.ethereumAddress",
        "WorldApp.user.account.verificationStatus",
      ],
    });
    expect(postMessages).toEqual([]);
  });

  it("reads direct World App account wrapper profiles without sending auth commands", () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        accountContext: {
          profile: {
            walletAddress: worldAppAddress,
            worldAppVersion: 4001017,
            deviceOS: "ios",
            verificationStatus: {
              isOrbVerified: true,
            },
          },
        },
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.getWorldAppAccountSource()).toBe("world_app");
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: worldAppAddress,
      world_app_version: 4001017,
      device_os: "ios",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: undefined,
        is_secure_document_verified: undefined,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      walletAddress: "present",
      accountSource: "world_app",
      accountSourceDetail: "world_app_account",
      worldAppShapeKeys: [
        "WorldApp.accountContext",
        "WorldApp.accountContext.profile",
      ],
    });
    expect(postMessages).toEqual([]);
  });

  it("reads direct World App account arrays without sending auth commands", () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        accounts: [
          {
            walletAddress: worldAppAddress,
            worldAppVersion: 4001018,
            deviceOS: "android",
            verificationStatus: {
              isOrbVerified: true,
              isDocumentVerified: false,
            },
          },
        ],
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.getWorldAppAccountSource()).toBe("world_app");
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: worldAppAddress,
      world_app_version: 4001018,
      device_os: "android",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: false,
        is_secure_document_verified: undefined,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      walletAddress: "present",
      accountSource: "world_app",
      accountSourceDetail: "world_app_account",
      worldAppShapeKeys: [
        "WorldApp.accounts",
        "WorldApp.accounts.0.deviceOS",
        "WorldApp.accounts.0.verificationStatus",
        "WorldApp.accounts.0.walletAddress",
        "WorldApp.accounts.0.worldAppVersion",
      ],
    });
    expect(postMessages).toEqual([]);
  });

  it("reads direct World App address arrays without sending auth commands", () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        addresses: [
          {
            walletAddress: worldAppAddress,
            worldAppVersion: 4001019,
            deviceOS: "ios",
            verificationStatus: {
              isOrbVerified: true,
              isDocumentVerified: true,
            },
          },
        ],
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.getWorldAppAccountSource()).toBe("world_app");
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: worldAppAddress,
      world_app_version: 4001019,
      device_os: "ios",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: true,
        is_secure_document_verified: undefined,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      walletAddress: "present",
      accountSource: "world_app",
      accountSourceDetail: "world_app_account",
      worldAppShapeKeys: [
        "WorldApp.addresses",
        "WorldApp.addresses.0.deviceOS",
        "WorldApp.addresses.0.verificationStatus",
        "WorldApp.addresses.0.walletAddress",
        "WorldApp.addresses.0.worldAppVersion",
      ],
    });
    expect(postMessages).toEqual([]);
  });

  it("reads direct World App data payload wrapper chains without sending auth commands", () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        data: {
          context: {
            account: {
              walletAddress: worldAppAddress,
              worldAppVersion: 4001021,
              deviceOS: "ios",
              verificationStatus: {
                isOrbVerified: true,
                isDocumentVerified: true,
              },
            },
          },
        },
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.getWorldAppAccountSource()).toBe("world_app");
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: worldAppAddress,
      world_app_version: 4001021,
      device_os: "ios",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: true,
        is_secure_document_verified: undefined,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      walletAddress: "present",
      accountSource: "world_app",
      accountSourceDetail: "world_app_account",
      worldAppShapeKeys: [
        "WorldApp.data",
        "WorldApp.data.context",
      ],
    });
    expect(postMessages).toEqual([]);
  });

  it("falls back to a MiniKit user address alias without starting wallet auth", () => {
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        world_app_version: 4001007,
      },
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
      getMiniKitState: () => ({
        user: {
          address: miniKitAddress,
        },
      }),
    });

    expect(runtime.getWorldAppAccountSource()).toBe("minikit");
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: miniKitAddress,
      world_app_version: 4001007,
      device_os: undefined,
      verification_status: undefined,
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      walletAddress: "present",
      accountSource: "minikit",
      accountSourceDetail: "minikit",
      miniKitUserKeys: ["address"],
    });
  });

  it("falls back to the MiniKit user account and maps camelCase verification fields", () => {
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        wallet_address: "not-an-address",
        world_app_version: 4001001,
        device_os: "android",
      },
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
      getMiniKitState: () => ({
        user: {
          walletAddress: miniKitAddress,
          verificationStatus: {
            isOrbVerified: true,
            isDocumentVerified: true,
            isSecureDocumentVerified: false,
          },
        },
        deviceProperties: {
          worldAppVersion: 4001002,
          deviceOS: "ios",
        },
        location: "deep-link",
        trigger: () => undefined,
        subscribe: () => undefined,
        unsubscribe: () => undefined,
      }),
    });

    expect(runtime.getWorldAppAccountSource()).toBe("minikit");
    expect(runtime.isInWorldApp()).toBe(true);
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: miniKitAddress,
      world_app_version: 4001001,
      device_os: "android",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: true,
        is_secure_document_verified: false,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      accountSource: "minikit",
      accountSourceDetail: "minikit",
      walletAddress: "present",
      orbVerified: true,
      worldAppVersion: 4001001,
      deviceOS: "android",
      launchLocation: "deep-link",
      miniKitUserKeys: ["verificationStatus", "walletAddress"],
    });
  });

  it("preserves an existing MiniKit user address when raw World App has no wallet address", () => {
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        world_app_version: 4001010,
        device_os: "ios",
      },
      MiniKit: {
        user: {
          walletAddress: miniKitAddress,
          verificationStatus: {
            isOrbVerified: true,
          },
        },
        deviceProperties: {
          worldAppVersion: 4001009,
          deviceOS: "android",
        },
        location: "deep-link",
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.refreshWorldAppContext("app_123")).toBe(true);

    expect(nativeWindow.MiniKit?.user?.walletAddress).toBe(miniKitAddress);
    expect(runtime.getWorldAppAccountSource()).toBe("minikit");
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: miniKitAddress,
      world_app_version: 4001010,
      device_os: "ios",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: undefined,
        is_secure_document_verified: undefined,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      accountSource: "minikit",
      accountSourceDetail: "minikit",
      walletAddress: "present",
      miniKitUserKeys: ["verificationStatus", "walletAddress"],
    });
  });

  it("falls back to a passive World App wallet provider selected address", () => {
    const providerAddress = "0x3333333333333333333333333333333333333333" as const;
    const nativeWindow = asWorldAppWindow({
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: () => undefined,
          },
        },
      },
      ethereum: {
        selectedAddress: providerAddress,
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.getWorldAppAccountSource()).toBe("wallet_provider");
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: providerAddress,
      world_app_version: undefined,
      device_os: undefined,
      verification_status: undefined,
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppRuntime: false,
      nativeTransport: true,
      accountSource: "wallet_provider",
      accountSourceDetail: "wallet_provider",
      walletAddress: "present",
    });
  });

  it("reads the official World EIP-1193 cached address only inside a World App surface", () => {
    const providerAddress = "0x3434343434343434343434343434343434343434" as const;
    const request = vi.fn();
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        world_app_version: 4001033,
      },
      __worldapp_eip1193_address__: providerAddress,
      __worldapp_eip1193_provider__: {
        request,
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.getWorldAppAccountSource()).toBe("wallet_provider");
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: providerAddress,
      world_app_version: 4001033,
      device_os: undefined,
      verification_status: undefined,
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppRuntime: true,
      accountSource: "wallet_provider",
      accountSourceDetail: "wallet_provider",
      walletAddress: "present",
    });
    expect(request).not.toHaveBeenCalled();
  });

  it("ignores official World EIP-1193 cached addresses outside a World App surface", () => {
    const providerAddress = "0x3535353535353535353535353535353535353535" as const;
    const nativeWindow = asWorldAppWindow({
      __worldapp_eip1193_address__: providerAddress,
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.getWorldAppAccountSnapshot()).toBeNull();
    expect(runtime.getWorldAppAccountSource()).toBe("missing");
    expect(runtime.isInWorldApp()).toBe(false);
  });

  it("reads passive wallet provider account aliases without requesting accounts", () => {
    const providerAddress = "0x3636363636363636363636363636363636363636" as const;
    const request = vi.fn();
    const nativeWindow = asWorldAppWindow({
      navigator: {
        userAgent: "Mozilla/5.0 (Linux; Android 14) WorldApp",
      },
      __worldapp_eip1193_provider__: {
        _accounts: [
          {
            accountAddress: providerAddress,
          },
        ],
        request,
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.getWorldAppAccountSource()).toBe("wallet_provider");
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: providerAddress,
      world_app_version: undefined,
      device_os: undefined,
      verification_status: undefined,
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppUserAgent: true,
      accountSource: "wallet_provider",
      accountSourceDetail: "wallet_provider",
      walletAddress: "present",
    });
    expect(request).not.toHaveBeenCalled();
  });

  it("reads nested passive wallet provider accounts only inside a World App surface", async () => {
    const providerAddress = "0x4444444444444444444444444444444444444444" as const;
    const nativeWindow = asWorldAppWindow({
      location: {
        origin: "https://veripost.io",
      },
      ethereum: {
        providers: [
          {
            _state: {
              accounts: [providerAddress],
            },
          },
        ],
      },
    });
    let currentTime = 0;
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
      now: () => currentTime,
      sleep: async (ms) => {
        currentTime += ms;
      },
    });

    expect(runtime.getWorldAppAccountSnapshot()).toBeNull();
    await expect(runtime.waitForWorldAppAccountRuntime("app_123", { timeoutMs: 50 })).rejects.toThrow(
      "Open VeriPost in World App",
    );

    nativeWindow.WorldApp = {
      world_app_version: 4001027,
    };

    expect(runtime.getWorldAppAccountSource()).toBe("wallet_provider");
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: providerAddress,
      world_app_version: 4001027,
      device_os: undefined,
      verification_status: undefined,
    });
  });

  it("reads snake-case and nested MiniKit account address shapes", () => {
    const nestedMiniKitAddress = "0x3333333333333333333333333333333333333333" as const;
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        world_app_version: 4001011,
      },
      MiniKit: {
        user: {
          account: {
            wallet_address: nestedMiniKitAddress,
          },
          wallet: {
            walletAddress: miniKitAddress,
          },
        },
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.getWorldAppAccountSource()).toBe("minikit");
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: nestedMiniKitAddress,
      world_app_version: 4001011,
      device_os: undefined,
      verification_status: undefined,
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      accountSource: "minikit",
      accountSourceDetail: "minikit",
      walletAddress: "present",
      miniKitUserKeys: ["account", "wallet"],
    });
  });

  it("reads direct lowercase MiniKit account state without installing the SDK", () => {
    const nativeWindow = asWorldAppWindow({
      world_app: {
        world_app_version: 4001015,
        device_os: "android",
      },
      miniKit: {
        user: {
          walletAddress: miniKitAddress,
          verificationStatus: {
            isOrbVerified: true,
          },
        },
        deviceProperties: {
          worldAppVersion: 4001016,
          deviceOS: "ios",
        },
        location: "wallet-tab",
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.getWorldAppAccountSource()).toBe("minikit");
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: miniKitAddress,
      world_app_version: 4001015,
      device_os: "android",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: undefined,
        is_secure_document_verified: undefined,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      accountSource: "minikit",
      accountSourceDetail: "minikit",
      walletAddress: "present",
      orbVerified: true,
      launchLocation: "wallet-tab",
      miniKitUserKeys: ["verificationStatus", "walletAddress"],
      worldAppShapeKeys: ["world_app.device_os", "world_app.world_app_version"],
    });
  });

  it("reads root MiniKit account state without installing the SDK", () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      MiniKit: {
        walletAddress: miniKitAddress,
        verificationStatus: {
          isOrbVerified: true,
          isDocumentVerified: false,
          isSecureDocumentVerified: true,
        },
        worldAppVersion: 4001019,
        deviceOS: "ios",
        location: "home",
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.refreshWorldAppContext("app_123")).toBe(true);
    expect(runtime.getWorldAppAccountSource()).toBe("minikit");
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: miniKitAddress,
      world_app_version: 4001019,
      device_os: "ios",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: false,
        is_secure_document_verified: true,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppRuntime: false,
      nativeTransport: true,
      walletAddress: "present",
      accountSource: "minikit",
      accountSourceDetail: "minikit",
      orbVerified: true,
      worldAppVersion: 4001019,
      deviceOS: "ios",
      launchLocation: "home",
      miniKitUserKeys: [],
    });
    expect(postMessages).toEqual([]);
  });

  it("reads MiniKit state user wrappers without installing the SDK", () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      MiniKit: {
        state: {
          user: {
            accountContext: {
              profile: {
                walletAddress: miniKitAddress,
                verificationStatus: {
                  isOrbVerified: true,
                  isDocumentVerified: true,
                },
              },
            },
          },
          deviceProperties: {
            worldAppVersion: 4001022,
            deviceOS: "android",
          },
          location: "deep-link",
        },
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.refreshWorldAppContext("app_123")).toBe(true);
    expect(runtime.getWorldAppAccountSource()).toBe("minikit");
    expect(runtime.getWorldAppAccountSnapshot()).toEqual({
      wallet_address: miniKitAddress,
      world_app_version: 4001022,
      device_os: "android",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: true,
        is_secure_document_verified: undefined,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppRuntime: false,
      nativeTransport: true,
      walletAddress: "present",
      accountSource: "minikit",
      accountSourceDetail: "minikit",
      orbVerified: true,
      worldAppVersion: 4001022,
      deviceOS: "android",
      launchLocation: "deep-link",
      miniKitUserKeys: [],
    });
    expect(postMessages).toEqual([]);
  });

  it("waits for World App to inject the account context", async () => {
    const nativeWindow = asWorldAppWindow({});
    let currentTime = 0;
    let sleepCount = 0;
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
      now: () => currentTime,
      sleep: async (ms) => {
        sleepCount += 1;
        currentTime += ms;
        if (sleepCount === 1) {
          nativeWindow.WorldApp = {
            wallet_address: worldAppAddress,
          };
        }
      },
    });

    await expect(runtime.waitForWorldAppAccountRuntime("app_123", { timeoutMs: 200 })).resolves.toEqual({
      wallet_address: worldAppAddress,
      world_app_version: undefined,
      device_os: undefined,
      verification_status: undefined,
    });
    expect(sleepCount).toBe(1);
  });

  it("passively captures World App account context from same-origin runtime messages", async () => {
    const nativeWindow = asWorldAppWindow({
      location: {
        origin: "https://veripost.io",
      },
    });
    let messageListener: ((event: { origin: string; data: unknown }) => void) | undefined;
    Object.assign(nativeWindow, {
      addEventListener: (eventName: string, listener: EventListener) => {
        if (eventName === "message") {
          messageListener = listener as unknown as (event: { origin: string; data: unknown }) => void;
        }
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.primeWorldAppRuntime()).toBe(false);
    messageListener?.({
      origin: "https://veripost.io",
      data: {
        type: "world_app_context",
        payload: {
          wallet_address: worldAppAddress,
          world_app_version: 4001030,
          device_os: "ios",
          verification_status: {
            is_orb_verified: true,
            is_document_verified: true,
            is_secure_document_verified: false,
          },
        },
      },
    });

    await expect(runtime.waitForWorldAppAccountRuntime("app_123", { timeoutMs: 50 })).resolves.toEqual({
      wallet_address: worldAppAddress,
      world_app_version: 4001030,
      device_os: "ios",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: true,
        is_secure_document_verified: false,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppRuntime: true,
      walletAddress: "present",
      accountSource: "world_app",
      accountSourceDetail: "world_app_message",
      worldAppVersion: 4001030,
      deviceOS: "ios",
      worldAppShapeKeys: [
        "WorldApp.message.payload",
        "WorldApp.message.type",
        "WorldApp.message.payload.device_os",
        "WorldApp.message.payload.verification_status",
        "WorldApp.message.payload.wallet_address",
        "WorldApp.message.payload.world_app_version",
      ],
    });
    expect(JSON.stringify(runtime.getWorldRuntimeDiagnostics())).not.toContain(worldAppAddress);
  });

  it("passively captures account context from known World origins only inside a World App surface", async () => {
    const nativeWindow = asWorldAppWindow({
      location: {
        origin: "https://veripost.io",
      },
      navigator: {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) WorldApp",
      },
    });
    let messageListener: ((event: { origin: string; data: unknown }) => void) | undefined;
    Object.assign(nativeWindow, {
      addEventListener: (eventName: string, listener: EventListener) => {
        if (eventName === "message") {
          messageListener = listener as unknown as (event: { origin: string; data: unknown }) => void;
        }
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.primeWorldAppRuntime()).toBe(false);
    messageListener?.({
      origin: "https://world.org",
      data: {
        context: {
          accountContext: {
            profile: {
              walletAddress: worldAppAddress,
              worldAppVersion: 4001031,
              deviceOS: "ios",
              verificationStatus: {
                isOrbVerified: true,
              },
            },
          },
        },
      },
    });

    await expect(runtime.waitForWorldAppAccountRuntime("app_123", { timeoutMs: 50 })).resolves.toEqual({
      wallet_address: worldAppAddress,
      world_app_version: 4001031,
      device_os: "ios",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: undefined,
        is_secure_document_verified: undefined,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppRuntime: true,
      worldAppUserAgent: true,
      walletAddress: "present",
      accountSource: "world_app",
      accountSourceDetail: "world_app_message",
    });
  });

  it("passively captures array-wrapped World App account messages", async () => {
    const nativeWindow = asWorldAppWindow({
      location: {
        origin: "https://veripost.io",
      },
      navigator: {
        userAgent: "Mozilla/5.0 (Linux; Android 14) WorldApp",
      },
    });
    let messageListener: ((event: { origin: string; data: unknown }) => void) | undefined;
    Object.assign(nativeWindow, {
      addEventListener: (eventName: string, listener: EventListener) => {
        if (eventName === "message") {
          messageListener = listener as unknown as (event: { origin: string; data: unknown }) => void;
        }
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.primeWorldAppRuntime()).toBe(false);
    messageListener?.({
      origin: "https://world.org",
      data: {
        payload: [
          {
            walletAddress: worldAppAddress,
            worldAppVersion: 4001034,
            deviceOS: "android",
            verificationStatus: {
              isOrbVerified: true,
            },
          },
        ],
      },
    });

    await expect(runtime.waitForWorldAppAccountRuntime("app_123", { timeoutMs: 50 })).resolves.toEqual({
      wallet_address: worldAppAddress,
      world_app_version: 4001034,
      device_os: "android",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: undefined,
        is_secure_document_verified: undefined,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppUserAgent: true,
      walletAddress: "present",
      accountSource: "world_app",
      accountSourceDetail: "world_app_message",
      worldAppVersion: 4001034,
      deviceOS: "android",
    });
  });

  it("passively captures account context from World ID wrapper messages", async () => {
    const nativeWindow = asWorldAppWindow({
      location: {
        origin: "https://veripost.io",
      },
      navigator: {
        userAgent: "Mozilla/5.0 (Linux; Android 14) WorldApp",
      },
    });
    let messageListener: ((event: { origin: string; data: unknown }) => void) | undefined;
    Object.assign(nativeWindow, {
      addEventListener: (eventName: string, listener: EventListener) => {
        if (eventName === "message") {
          messageListener = listener as unknown as (event: { origin: string; data: unknown }) => void;
        }
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.primeWorldAppRuntime()).toBe(false);
    messageListener?.({
      origin: "https://world.org",
      data: {
        worldId: {
          account: {
            primaryAddress: worldAppAddress,
            worldAppVersion: 4001035,
            deviceOS: "android",
            verificationStatus: {
              isOrbVerified: true,
            },
          },
        },
      },
    });

    await expect(runtime.waitForWorldAppAccountRuntime("app_123", { timeoutMs: 50 })).resolves.toEqual({
      wallet_address: worldAppAddress,
      world_app_version: 4001035,
      device_os: "android",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: undefined,
        is_secure_document_verified: undefined,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppRuntime: true,
      worldAppUserAgent: true,
      walletAddress: "present",
      accountSource: "world_app",
      accountSourceDetail: "world_app_message",
      worldAppVersion: 4001035,
      deviceOS: "android",
    });
  });

  it("passively captures account context from World ID custom events", async () => {
    const nativeWindow = asWorldAppWindow({
      location: {
        origin: "https://veripost.io",
      },
    });
    const listeners = new Map<string, EventListener>();
    Object.assign(nativeWindow, {
      addEventListener: (eventName: string, listener: EventListener) => {
        listeners.set(eventName, listener);
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.primeWorldAppRuntime()).toBe(false);
    listeners.get("WorldID")?.({
      detail: {
        worldId: {
          account: {
            walletAddress: worldAppAddress,
            worldAppVersion: 4001036,
            deviceOS: "ios",
            verificationStatus: {
              isOrbVerified: true,
            },
          },
        },
      },
    } as CustomEvent);

    await expect(runtime.waitForWorldAppAccountRuntime("app_123", { timeoutMs: 50 })).resolves.toEqual({
      wallet_address: worldAppAddress,
      world_app_version: 4001036,
      device_os: "ios",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: undefined,
        is_secure_document_verified: undefined,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppRuntime: true,
      walletAddress: "present",
      accountSource: "world_app",
      accountSourceDetail: "world_app_message",
      worldAppVersion: 4001036,
      deviceOS: "ios",
    });
    expect(JSON.stringify(runtime.getWorldRuntimeDiagnostics())).not.toContain(worldAppAddress);
  });

  it("passively captures account context from World App account custom events", async () => {
    const nativeWindow = asWorldAppWindow({
      location: {
        origin: "https://veripost.io",
      },
      navigator: {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) WorldApp",
      },
    });
    const listeners = new Map<string, EventListener>();
    Object.assign(nativeWindow, {
      addEventListener: (eventName: string, listener: EventListener) => {
        listeners.set(eventName, listener);
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.primeWorldAppRuntime()).toBe(false);
    listeners.get("miniapp-account")?.({
      detail: {
        status: "success",
        address: worldAppAddress,
        verificationStatus: {
          isOrbVerified: true,
        },
      },
    } as CustomEvent);

    await expect(runtime.waitForWorldAppAccountRuntime("app_123", { timeoutMs: 50 })).resolves.toEqual({
      wallet_address: worldAppAddress,
      world_app_version: undefined,
      device_os: undefined,
      verification_status: {
        is_orb_verified: true,
        is_document_verified: undefined,
        is_secure_document_verified: undefined,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppUserAgent: true,
      walletAddress: "present",
      accountSource: "world_app",
      accountSourceDetail: "world_app_message",
    });
    expect(JSON.stringify(runtime.getWorldRuntimeDiagnostics())).not.toContain(worldAppAddress);
  });

  it("passively captures Android-style document messages inside a World App surface", async () => {
    const nativeWindow = asWorldAppWindow({
      location: {
        origin: "https://veripost.io",
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: () => undefined,
          },
        },
      },
    });
    let documentMessageListener: ((event: { origin: string; data: unknown }) => void) | undefined;
    Object.assign(nativeWindow, {
      document: {
        addEventListener: (eventName: string, listener: EventListener) => {
          if (eventName === "message") {
            documentMessageListener = listener as unknown as (event: { origin: string; data: unknown }) => void;
          }
        },
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.primeWorldAppRuntime()).toBe(false);
    documentMessageListener?.({
      origin: "null",
      data: JSON.stringify({
        payload: {
          wallet_address: worldAppAddress,
          world_app_version: 4001032,
          device_os: "android",
          verification_status: {
            is_orb_verified: true,
          },
        },
      }),
    });

    await expect(runtime.waitForWorldAppAccountRuntime("app_123", { timeoutMs: 50 })).resolves.toEqual({
      wallet_address: worldAppAddress,
      world_app_version: 4001032,
      device_os: "android",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: undefined,
        is_secure_document_verified: undefined,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppRuntime: true,
      nativeTransport: true,
      walletAddress: "present",
      accountSource: "world_app",
      accountSourceDetail: "world_app_message",
      worldAppVersion: 4001032,
      deviceOS: "android",
    });
    expect(JSON.stringify(runtime.getWorldRuntimeDiagnostics())).not.toContain(worldAppAddress);
  });

  it("accepts World App custom-scheme passive messages only inside a World App surface", async () => {
    const nativeWindow = asWorldAppWindow({
      location: {
        origin: "https://veripost.io",
      },
      navigator: {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) WorldApp",
      },
    });
    let messageListener: ((event: { origin: string; data: unknown }) => void) | undefined;
    Object.assign(nativeWindow, {
      addEventListener: (eventName: string, listener: EventListener) => {
        if (eventName === "message") {
          messageListener = listener as unknown as (event: { origin: string; data: unknown }) => void;
        }
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.primeWorldAppRuntime()).toBe(false);
    messageListener?.({
      origin: "worldapp://mini-app",
      data: {
        payload: {
          wallet_address: worldAppAddress,
          world_app_version: 4001037,
          device_os: "ios",
        },
      },
    });

    await expect(runtime.waitForWorldAppAccountRuntime("app_123", { timeoutMs: 50 })).resolves.toEqual({
      wallet_address: worldAppAddress,
      world_app_version: 4001037,
      device_os: "ios",
      verification_status: undefined,
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppUserAgent: true,
      walletAddress: "present",
      accountSourceDetail: "world_app_message",
    });
  });

  it("ignores cross-origin passive World App account messages", async () => {
    const nativeWindow = asWorldAppWindow({
      location: {
        origin: "https://veripost.io",
      },
    });
    let messageListener: ((event: { origin: string; data: unknown }) => void) | undefined;
    Object.assign(nativeWindow, {
      addEventListener: (eventName: string, listener: EventListener) => {
        if (eventName === "message") {
          messageListener = listener as unknown as (event: { origin: string; data: unknown }) => void;
        }
      },
    });
    let currentTime = 0;
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
      now: () => currentTime,
      sleep: async (ms) => {
        currentTime += ms;
      },
    });

    expect(runtime.primeWorldAppRuntime()).toBe(false);
    messageListener?.({
      origin: "https://attacker.example",
      data: {
        wallet_address: worldAppAddress,
      },
    });

    await expect(runtime.waitForWorldAppAccountRuntime("app_123", { timeoutMs: 50 })).rejects.toThrow(
      "Open VeriPost in World App",
    );
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      walletAddress: "missing",
      accountSource: "missing",
    });
  });

  it("keeps an early passive account message when a walletless World App payload appears later", async () => {
    const nativeWindow = asWorldAppWindow({
      location: {
        origin: "https://veripost.io",
      },
    });
    let messageListener: ((event: { origin: string; data: unknown }) => void) | undefined;
    Object.assign(nativeWindow, {
      addEventListener: (eventName: string, listener: EventListener) => {
        if (eventName === "message") {
          messageListener = listener as unknown as (event: { origin: string; data: unknown }) => void;
        }
      },
    });
    const runtime = createWorldAppRuntime({ getWindow: () => nativeWindow });

    expect(runtime.primeWorldAppRuntime()).toBe(false);
    messageListener?.({
      origin: "https://veripost.io",
      data: {
        accountContext: {
          walletAddress: worldAppAddress,
          verificationStatus: {
            isOrbVerified: true,
          },
        },
      },
    });
    nativeWindow.WorldApp = {
      supported_commands: worldAppSupportedCommands(),
      world_app_version: 4001038,
      device_os: "ios",
    };

    await expect(runtime.waitForWorldAppAccountRuntime("app_123", { timeoutMs: 50 })).resolves.toEqual({
      wallet_address: worldAppAddress,
      world_app_version: 4001038,
      device_os: "ios",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: undefined,
        is_secure_document_verified: undefined,
      },
    });
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppRuntime: true,
      walletAddress: "present",
      accountSource: "world_app",
      accountSourceDetail: "world_app_message",
    });
  });

  it("ignores known World origin account messages outside a World App surface", async () => {
    const nativeWindow = asWorldAppWindow({
      location: {
        origin: "https://veripost.io",
      },
    });
    let messageListener: ((event: { origin: string; data: unknown }) => void) | undefined;
    Object.assign(nativeWindow, {
      addEventListener: (eventName: string, listener: EventListener) => {
        if (eventName === "message") {
          messageListener = listener as unknown as (event: { origin: string; data: unknown }) => void;
        }
      },
    });
    let currentTime = 0;
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
      now: () => currentTime,
      sleep: async (ms) => {
        currentTime += ms;
      },
    });

    expect(runtime.primeWorldAppRuntime()).toBe(false);
    messageListener?.({
      origin: "https://world.org",
      data: {
        accountContext: {
          walletAddress: worldAppAddress,
        },
      },
    });

    await expect(runtime.waitForWorldAppAccountRuntime("app_123", { timeoutMs: 50 })).rejects.toThrow(
      "Open VeriPost in World App",
    );
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      walletAddress: "missing",
      accountSource: "missing",
    });
  });

  it("reads existing MiniKit public account state without installing the SDK", async () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        world_app_version: 4001020,
        device_os: "ios",
        supportedCommands: [
          { name: "wallet-auth", supportedVersions: [2] },
          { name: "share", supportedVersions: [1] },
        ],
      },
      MiniKit: {
        user: {
          walletAddress: miniKitAddress,
          verificationStatus: {
            isOrbVerified: true,
            isDocumentVerified: false,
            isSecureDocumentVerified: false,
          },
        },
        deviceProperties: {
          worldAppVersion: 4001020,
          deviceOS: "ios",
        },
        location: "home",
        trigger: () => undefined,
        subscribe: () => undefined,
        unsubscribe: () => undefined,
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    await expect(runtime.waitForWorldAppAccountRuntime("app_123", { timeoutMs: 200 })).resolves.toEqual({
      wallet_address: miniKitAddress,
      world_app_version: 4001020,
      device_os: "ios",
      verification_status: {
        is_orb_verified: true,
        is_document_verified: false,
        is_secure_document_verified: false,
      },
    });
    expect((nativeWindow.WorldApp as Record<string, unknown> | undefined)?.supported_commands).toBeUndefined();
    expect(postMessages).toEqual([]);
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      accountSource: "minikit",
      accountSourceDetail: "minikit",
      miniKitBridge: {
        trigger: true,
        subscribe: true,
        unsubscribe: true,
      },
      worldAppInit: {
        attempted: false,
        success: null,
      },
      miniKitUserKeys: ["verificationStatus", "walletAddress"],
    });
  });

  it("does not send native state requests when the World App runtime lacks account context", async () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        world_app_version: 4001025,
        device_os: "ios",
        supported_commands: [
          { name: "verify", supported_versions: [1] },
          { name: "share", supported_versions: [1] },
        ],
        location: {
          open_origin: "mini-app-listing",
        },
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    let currentTime = 0;
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
      now: () => currentTime,
      sleep: async (ms) => {
        currentTime += ms;
      },
    });

    expect(runtime.primeWorldAppRuntime()).toBe(false);
    expect(runtime.refreshWorldAppContext("app_dc56f8eecb48c4d395981ec1ca5c6329")).toBe(false);
    expect(postMessages).toEqual([]);
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      nativeTransport: true,
      walletAddress: "missing",
      accountSource: "missing",
      worldAppInit: {
        attempted: false,
        success: null,
        attempts: 0,
        transport: "missing",
        stateContainer: "missing",
      },
    });
    await expect(runtime.waitForWorldAppAccountRuntime("app_dc56f8eecb48c4d395981ec1ca5c6329", {
      timeoutMs: 100,
    })).rejects.toThrow("World App did not expose your logged-in account.");
    expect(postMessages).toEqual([]);
    expect(nativeWindow.MiniKit).toBeUndefined();
  });

  it("requests World App state in the real browser WorldApp payload without account context", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        world_app_version: 4001025,
        device_os: "ios",
        supported_commands: worldAppSupportedCommands(),
        location: {
          open_origin: "mini-app-listing",
        },
      },
      navigator: {
        userAgent: "WorldApp iPhone",
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: nativeWindow,
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    expect(runtime.primeWorldAppRuntime()).toBe(false);
    expect(runtime.refreshWorldAppContext("app_dc56f8eecb48c4d395981ec1ca5c6329")).toBe(false);

    expect(postMessages).toEqual([
      expect.objectContaining({ command: "init" }),
      expect.objectContaining({ command: "init" }),
    ]);
    expect(nativeWindow.MiniKit).toBeDefined();
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      nativeTransport: true,
      walletAddress: "missing",
      accountSource: "missing",
      miniKitBridge: {
        trigger: true,
        subscribe: true,
        unsubscribe: true,
      },
      worldAppInit: {
        attempted: true,
        success: true,
        attempts: 2,
        transport: "ios",
        stateContainer: "existing",
      },
    });
    warnSpy.mockRestore();
  });

  it("primes official MiniKit account-state initialization with the configured app id before config is loaded", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        world_app_version: 4001025,
        device_os: "ios",
        supported_commands: worldAppSupportedCommands(),
        location: {
          open_origin: "mini-app-listing",
        },
      },
      navigator: {
        userAgent: "WorldApp iPhone",
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: nativeWindow,
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    expect(runtime.primeWorldAppRuntime("app_dc56f8eecb48c4d395981ec1ca5c6329")).toBe(false);

    expect(postMessages).toEqual([
      {
        command: "init",
        payload: {
          version: 1,
          minorVersion: 96,
        },
      },
    ]);
    expect(nativeWindow.MiniKit).toBeDefined();
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppRuntime: true,
      nativeTransport: true,
      worldAppUserAgent: true,
      walletAddress: "missing",
      worldAppInit: {
        attempted: true,
        success: true,
        attempts: 1,
        transport: "ios",
        stateContainer: "created",
      },
    });
    expect(JSON.stringify(postMessages)).not.toContain("wallet-auth");
    expect(warnSpy).not.toHaveBeenCalledWith("App ID not provided during install");
    warnSpy.mockRestore();
  });

  it("blocks redirect-capable MiniKit commands exposed by state-only install", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const postMessages: unknown[] = [];
    const blockedEvents: Array<{ type?: string; detail?: unknown }> = [];
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        world_app_version: 4001025,
        device_os: "ios",
        supported_commands: worldAppSupportedCommands(),
        location: {
          open_origin: "mini-app-listing",
        },
      },
      navigator: {
        userAgent: "WorldApp iPhone",
      },
      CustomEvent: class {
        type: string;
        detail: unknown;

        constructor(type: string, init?: { detail?: unknown }) {
          this.type = type;
          this.detail = init?.detail;
        }
      },
      dispatchEvent: (event: { type?: string; detail?: unknown }) => {
        blockedEvents.push(event);
        return true;
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: nativeWindow,
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    expect(runtime.primeWorldAppRuntime("app_dc56f8eecb48c4d395981ec1ca5c6329")).toBe(false);
    const miniKit = nativeWindow.MiniKit as unknown as Record<string, () => Promise<unknown>>;

    await expect(miniKit.walletAuth()).rejects.toThrow("logged-in World App account context");
    await expect(miniKit.signMessage()).rejects.toThrow("logged-in World App account context");

    expect(postMessages).toEqual([
      {
        command: "init",
        payload: {
          version: 1,
          minorVersion: 96,
        },
      },
    ]);
    expect(JSON.stringify(postMessages)).not.toContain("wallet-auth");
    expect(JSON.stringify(postMessages)).not.toContain("sign-message");
    expect(blockedEvents).toMatchObject([
      {
        type: "veripost:minikit-command-blocked",
        detail: { command: "walletAuth" },
      },
      {
        type: "veripost:minikit-command-blocked",
        detail: { command: "signMessage" },
      },
    ]);
    warnSpy.mockRestore();
  });

  it("blocks direct native bridge commands while allowing state init", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const postMessages: unknown[] = [];
    const blockedEvents: Array<{ type?: string; detail?: unknown }> = [];
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        world_app_version: 4001025,
        device_os: "ios",
        supported_commands: worldAppSupportedCommands(),
        location: {
          open_origin: "mini-app-listing",
        },
      },
      navigator: {
        userAgent: "WorldApp iPhone",
      },
      CustomEvent: class {
        type: string;
        detail: unknown;

        constructor(type: string, init?: { detail?: unknown }) {
          this.type = type;
          this.detail = init?.detail;
        }
      },
      dispatchEvent: (event: { type?: string; detail?: unknown }) => {
        blockedEvents.push(event);
        return true;
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: nativeWindow,
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    expect(runtime.primeWorldAppRuntime("app_dc56f8eecb48c4d395981ec1ca5c6329")).toBe(false);
    nativeWindow.webkit?.messageHandlers?.minikit?.postMessage?.({
      command: "wallet-auth",
      version: 2,
      payload: { nonce: "secret" },
    });
    nativeWindow.webkit?.messageHandlers?.minikit?.postMessage?.(JSON.stringify({
      command: "sign-message",
      version: 1,
      payload: { message: "secret" },
    }));
    nativeWindow.webkit?.messageHandlers?.minikit?.postMessage?.({
      command: "verify",
      version: 2,
      payload: { stale: true },
    });
    nativeWindow.__veripostAllowNativeWorldIdkitVerifyUntil = Date.now() + 1_000;
    nativeWindow.webkit?.messageHandlers?.minikit?.postMessage?.({
      command: "verify",
      version: 2,
      payload: { request: "idkit" },
    });

    expect(postMessages).toEqual([
      {
        command: "init",
        payload: {
          version: 1,
          minorVersion: 96,
        },
      },
      {
        command: "verify",
        payload: { request: "idkit" },
        version: 2,
      },
    ]);
    expect(JSON.stringify(postMessages)).not.toContain("wallet-auth");
    expect(JSON.stringify(postMessages)).not.toContain("sign-message");
    expect(blockedEvents).toMatchObject([
      {
        type: "veripost:native-command-blocked",
        detail: { command: "wallet-auth" },
      },
      {
        type: "veripost:native-command-blocked",
        detail: { command: "sign-message" },
      },
      {
        type: "veripost:native-command-blocked",
        detail: { command: "verify" },
      },
    ]);
    warnSpy.mockRestore();
  });

  it("blocks redirect-capable commands on existing host MiniKit stubs", async () => {
    const nativeCommandMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        wallet_address: worldAppAddress,
        world_app_version: 4001025,
        device_os: "ios",
        supported_commands: worldAppSupportedCommands(),
      },
      MiniKit: {
        walletAuth: () => {
          nativeCommandMessages.push({ command: "wallet-auth" });
          return Promise.resolve({ status: "success" });
        },
        commands: {
          signMessage: () => {
            nativeCommandMessages.push({ command: "sign-message" });
            return Promise.resolve({ status: "success" });
          },
        },
      },
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    expect(runtime.primeWorldAppRuntime("app_dc56f8eecb48c4d395981ec1ca5c6329")).toBe(true);
    const miniKit = nativeWindow.MiniKit as unknown as {
      walletAuth: () => Promise<unknown>;
      commands: { signMessage: () => Promise<unknown> };
    };

    await expect(miniKit.walletAuth()).rejects.toThrow("logged-in World App account context");
    await expect(miniKit.commands.signMessage()).rejects.toThrow("logged-in World App account context");
    expect(nativeCommandMessages).toEqual([]);
    expect(runtime.getWorldAppAccountSnapshot()).toMatchObject({
      wallet_address: worldAppAddress,
    });
  });

  it("falls back to raw state init when official MiniKit cannot reach an alternate iOS bridge", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        world_app_version: 4001025,
        device_os: "ios",
        supported_commands: worldAppSupportedCommands(),
        location: {
          open_origin: "mini-app-listing",
        },
      },
      navigator: {
        userAgent: "WorldApp iPhone",
      },
      webkit: {
        messageHandlers: {
          MiniKit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: nativeWindow,
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    expect(runtime.primeWorldAppRuntime("app_dc56f8eecb48c4d395981ec1ca5c6329")).toBe(false);

    expect(postMessages).toEqual([
      {
        command: "init",
        payload: {
          version: 1,
          minorVersion: 96,
        },
      },
    ]);
    expect(nativeWindow.MiniKit).toBeDefined();
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      nativeTransport: true,
      walletAddress: "missing",
      worldAppInit: {
        attempted: true,
        success: true,
        attempts: 1,
        transport: "ios",
        stateContainer: "created",
      },
    });
    expect(JSON.stringify(postMessages)).not.toContain("wallet-auth");
    warnSpy.mockRestore();
  });

  it("falls back to raw Android state init when webkit prevents official MiniKit from using Android", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const androidMessages: string[] = [];
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        world_app_version: 4001025,
        device_os: "android",
        supported_commands: worldAppSupportedCommands(),
        location: {
          open_origin: "mini-app-listing",
        },
      },
      navigator: {
        userAgent: "WorldApp Android",
      },
      webkit: {
        messageHandlers: {},
      },
      Android: {
        postMessage: (payload: string) => androidMessages.push(payload),
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: nativeWindow,
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    expect(runtime.primeWorldAppRuntime("app_dc56f8eecb48c4d395981ec1ca5c6329")).toBe(false);

    expect(androidMessages.map((payload) => JSON.parse(payload) as unknown)).toEqual([
      {
        command: "init",
        payload: {
          version: 1,
          minorVersion: 96,
        },
      },
    ]);
    expect(nativeWindow.MiniKit).toBeDefined();
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      nativeTransport: true,
      deviceOS: null,
      walletAddress: "missing",
      worldAppInit: {
        attempted: true,
        success: true,
        attempts: 1,
        transport: "android",
        stateContainer: "created",
      },
    });
    expect(androidMessages.join("\n")).not.toContain("wallet-auth");
    warnSpy.mockRestore();
  });

  it("blocks direct Android bridge command strings while allowing raw state init", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const androidMessages: string[] = [];
    const blockedEvents: Array<{ type?: string; detail?: unknown }> = [];
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        world_app_version: 4001025,
        device_os: "android",
        supported_commands: worldAppSupportedCommands(),
        location: {
          open_origin: "mini-app-listing",
        },
      },
      navigator: {
        userAgent: "WorldApp Android",
      },
      CustomEvent: class {
        type: string;
        detail: unknown;

        constructor(type: string, init?: { detail?: unknown }) {
          this.type = type;
          this.detail = init?.detail;
        }
      },
      dispatchEvent: (event: { type?: string; detail?: unknown }) => {
        blockedEvents.push(event);
        return true;
      },
      webkit: {
        messageHandlers: {},
      },
      Android: {
        postMessage: (payload: string) => androidMessages.push(payload),
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: nativeWindow,
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    expect(runtime.primeWorldAppRuntime("app_dc56f8eecb48c4d395981ec1ca5c6329")).toBe(false);
    nativeWindow.Android?.postMessage?.(JSON.stringify({
      command: "open-url",
      version: 1,
      payload: { url: "https://auth.example.com" },
    }));

    expect(androidMessages.map((payload) => JSON.parse(payload) as unknown)).toEqual([
      {
        command: "init",
        payload: {
          version: 1,
          minorVersion: 96,
        },
      },
    ]);
    expect(androidMessages.join("\n")).not.toContain("open-url");
    expect(blockedEvents).toMatchObject([
      {
        type: "veripost:native-command-blocked",
        detail: { command: "open-url" },
      },
    ]);
    warnSpy.mockRestore();
  });

  it("requests World App state when the native bridge appears before the WorldApp payload", () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      navigator: {
        userAgent: "WorldApp iPhone",
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: nativeWindow,
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    expect(runtime.refreshWorldAppContext("app_dc56f8eecb48c4d395981ec1ca5c6329")).toBe(false);

    expect(postMessages).toEqual([
      expect.objectContaining({ command: "init" }),
    ]);
    expect(nativeWindow.MiniKit).toBeUndefined();
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppRuntime: false,
      nativeTransport: true,
      worldAppUserAgent: true,
      walletAddress: "missing",
      accountSource: "missing",
      worldAppInit: {
        attempted: true,
        success: true,
        attempts: 1,
        transport: "ios",
        stateContainer: "skipped",
      },
    });
  });

  it("requests World App state from a strong MiniKit bridge even before user-agent or WorldApp globals appear", () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      navigator: {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: nativeWindow,
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    expect(runtime.primeWorldAppRuntime("app_dc56f8eecb48c4d395981ec1ca5c6329")).toBe(false);

    expect(postMessages).toEqual([
      {
        command: "init",
        payload: {
          version: 1,
          minorVersion: 96,
        },
      },
    ]);
    expect(nativeWindow.MiniKit).toBeUndefined();
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppRuntime: false,
      nativeTransport: true,
      worldAppUserAgent: false,
      walletAddress: "missing",
      accountSource: "missing",
      worldAppInit: {
        attempted: true,
        success: true,
        attempts: 1,
        transport: "ios",
        stateContainer: "skipped",
      },
    });
    expect(JSON.stringify(postMessages)).not.toContain("wallet-auth");
    expect(JSON.stringify(postMessages)).not.toContain("sign-message");
    expect(JSON.stringify(postMessages)).not.toContain("sign-typed-data");
  });

  it("keeps generic browser bridges passive without World App bridge evidence", () => {
    const postMessages: string[] = [];
    const nativeWindow = asWorldAppWindow({
      navigator: {
        userAgent: "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36",
      },
      ReactNativeWebView: {
        postMessage: (payload: string) => postMessages.push(payload),
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: nativeWindow,
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    expect(runtime.primeWorldAppRuntime("app_dc56f8eecb48c4d395981ec1ca5c6329")).toBe(false);

    expect(postMessages).toEqual([]);
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      nativeTransport: true,
      worldAppUserAgent: false,
      walletAddress: "missing",
      worldAppInit: {
        attempted: false,
        success: null,
        attempts: 0,
        transport: "missing",
        stateContainer: "missing",
      },
    });
  });

  it("retries non-auth World App state init while account context remains missing", () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        world_app_version: 4001025,
        device_os: "ios",
        supported_commands: worldAppSupportedCommands(),
        location: {
          open_origin: "mini-app-listing",
        },
      },
      navigator: {
        userAgent: "WorldApp iPhone",
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: nativeWindow,
    });
    let currentTime = 0;
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
      now: () => currentTime,
    });

    expect(runtime.refreshWorldAppContext("app_dc56f8eecb48c4d395981ec1ca5c6329")).toBe(false);
    expect(postMessages).toHaveLength(1);

    expect(runtime.refreshWorldAppContext("app_dc56f8eecb48c4d395981ec1ca5c6329")).toBe(false);
    expect(postMessages).toHaveLength(1);

    currentTime += 999;
    expect(runtime.refreshWorldAppContext("app_dc56f8eecb48c4d395981ec1ca5c6329")).toBe(false);
    expect(postMessages).toHaveLength(1);

    for (let expectedAttempts = 2; expectedAttempts <= 5; expectedAttempts += 1) {
      currentTime += expectedAttempts === 2 ? 1 : 1_000;
      expect(runtime.refreshWorldAppContext("app_dc56f8eecb48c4d395981ec1ca5c6329")).toBe(false);
      expect(postMessages).toHaveLength(expectedAttempts);
    }

    currentTime += 1_000;
    expect(runtime.refreshWorldAppContext("app_dc56f8eecb48c4d395981ec1ca5c6329")).toBe(false);
    expect(postMessages).toHaveLength(5);
    expect(postMessages).toEqual(
      Array.from({ length: 5 }, () => ({
        command: "init",
        payload: {
          version: 1,
          minorVersion: 96,
        },
      })),
    );
    expect(JSON.stringify(postMessages)).not.toContain("wallet-auth");
    expect(nativeWindow.MiniKit).toBeDefined();
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppRuntime: true,
      nativeTransport: true,
      worldAppUserAgent: true,
      walletAddress: "missing",
      accountSource: "missing",
      worldAppInit: {
        attempted: true,
        success: true,
        attempts: 5,
        transport: "ios",
        stateContainer: "existing",
      },
    });
  });

  it("retries World App state init after the native transport appears", () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      navigator: {
        userAgent: "WorldApp iPhone",
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: nativeWindow,
    });
    let currentTime = 0;
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
      now: () => currentTime,
    });

    expect(runtime.refreshWorldAppContext("app_dc56f8eecb48c4d395981ec1ca5c6329")).toBe(false);
    expect(postMessages).toEqual([]);
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      nativeTransport: false,
      worldAppUserAgent: true,
      worldAppInit: {
        attempted: true,
        success: false,
        attempts: 1,
        transport: "missing",
        errorCode: "missing_transport",
      },
    });

    nativeWindow.webkit = {
      messageHandlers: {
        minikit: {
          postMessage: (payload: unknown) => postMessages.push(payload),
        },
      },
    };
    currentTime += 1_000;
    expect(runtime.refreshWorldAppContext("app_dc56f8eecb48c4d395981ec1ca5c6329")).toBe(false);

    expect(postMessages).toEqual([
      {
        command: "init",
        payload: {
          version: 1,
          minorVersion: 96,
        },
      },
    ]);
    expect(nativeWindow.MiniKit).toBeUndefined();
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      nativeTransport: true,
      worldAppUserAgent: true,
      walletAddress: "missing",
      accountSource: "missing",
      worldAppInit: {
        attempted: true,
        success: true,
        attempts: 2,
        transport: "ios",
        stateContainer: "skipped",
        errorCode: null,
        errorMessage: null,
      },
    });
  });

  it("reads the real World App account without sending init when account context is present", () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        wallet_address: worldAppAddress,
        world_app_version: 4001028,
        device_os: "ios",
        supported_commands: worldAppSupportedCommands(),
        location: {
          open_origin: "mini-app-listing",
        },
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: nativeWindow,
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    expect(runtime.refreshWorldAppContext("app_123")).toBe(true);
    expect(runtime.refreshWorldAppContext("app_123")).toBe(true);

    expect(nativeWindow.MiniKit).toBeUndefined();
    expect(postMessages).toEqual([]);
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      accountSource: "world_app",
      accountSourceDetail: "world_app_flat",
      miniKitBridge: {
        trigger: false,
        subscribe: false,
        unsubscribe: false,
      },
      worldAppInit: {
        attempted: false,
        success: null,
        attempts: 0,
        transport: "missing",
        stateContainer: "missing",
      },
    });
  });

  it("preserves partial host MiniKit stubs while reading the World App account", () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      MiniKit: {
        user: {},
      },
      WorldApp: {
        wallet_address: worldAppAddress,
        world_app_version: 4001028,
        device_os: "ios",
        supported_commands: worldAppSupportedCommands(),
        location: {
          open_origin: "mini-app-listing",
        },
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: nativeWindow,
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    expect(runtime.refreshWorldAppContext("app_123")).toBe(true);

    expect(nativeWindow.MiniKit).toEqual({ user: {} });
    expect(postMessages).toEqual([]);
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      miniKitBridge: {
        trigger: false,
        subscribe: false,
        unsubscribe: false,
      },
      walletAddress: "present",
      accountSource: "world_app",
    });
  });

  it("does not replace host MiniKit trigger stubs during app refresh", () => {
    const postMessages: unknown[] = [];
    const hostMiniKit = {
      trigger: vi.fn(),
      user: {},
    };
    const originalTrigger = hostMiniKit.trigger;
    const nativeWindow = asWorldAppWindow({
      MiniKit: hostMiniKit,
      WorldApp: {
        wallet_address: worldAppAddress,
        world_app_version: 4001028,
        device_os: "ios",
        supported_commands: worldAppSupportedCommands(),
        location: {
          open_origin: "mini-app-listing",
        },
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: nativeWindow,
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    expect(runtime.refreshWorldAppContext("app_123")).toBe(true);

    expect(nativeWindow.MiniKit).toBe(hostMiniKit);
    expect(nativeWindow.MiniKit?.trigger).toBe(originalTrigger);
    expect(nativeWindow.MiniKit?.user?.walletAddress).toBeUndefined();
    expect(postMessages).toEqual([]);
    expect(originalTrigger).not.toHaveBeenCalled();
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      miniKitBridge: {
        trigger: true,
        subscribe: false,
        unsubscribe: false,
      },
      walletAddress: "present",
      accountSource: "world_app",
    });
  });

  it("requests state from a strong MiniKit bridge-only browser surface", () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: nativeWindow,
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    expect(runtime.refreshWorldAppContext("app_123")).toBe(false);

    expect(nativeWindow.MiniKit).toBeUndefined();
    expect(nativeWindow.WorldApp).toBeUndefined();
    expect(postMessages).toEqual([
      {
        command: "init",
        payload: {
          version: 1,
          minorVersion: 96,
        },
      },
    ]);
    expect(runtime.getWorldRuntimeDiagnostics().worldAppInit).toMatchObject({
      attempted: true,
      success: true,
      attempts: 1,
      transport: "ios",
      stateContainer: "skipped",
    });
  });

  it("does not mutate read-only MiniKit state", () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        world_app_version: 4001026,
        device_os: "ios",
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    Object.defineProperty(nativeWindow, "MiniKit", {
      configurable: true,
      get: () => undefined,
      set: () => {
        throw new Error("MiniKit is read-only");
      },
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    expect(runtime.refreshWorldAppContext("app_123")).toBe(false);

    expect(postMessages).toEqual([]);
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      walletAddress: "missing",
      worldAppInit: {
        attempted: false,
        success: null,
        attempts: 0,
        transport: "missing",
        stateContainer: "missing",
      },
    });
  });

  it("treats native transport as an in-app surface while waiting for the raw account", async () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    let currentTime = 0;
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
      now: () => currentTime,
      sleep: async (ms) => {
        currentTime += ms;
      },
    });

    expect(runtime.hasWorldAppRuntime()).toBe(false);
    expect(runtime.hasNativeWorldAppTransport()).toBe(true);
    expect(runtime.isInWorldApp()).toBe(true);
    expect(runtime.refreshWorldAppContext("app_123")).toBe(false);
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppRuntime: false,
      nativeTransport: true,
      worldAppUserAgent: false,
      walletAddress: "missing",
      accountSource: "missing",
      accountSourceDetail: "missing",
      worldAppInit: {
        attempted: false,
        success: null,
        attempts: 0,
        transport: "missing",
        stateContainer: "missing",
      },
    });
    await expect(runtime.waitForWorldAppAccountRuntime("app_123", { timeoutMs: 100 })).rejects.toThrow(
      "World App did not expose your logged-in account.",
    );
    expect(postMessages).toEqual([]);
  });

  it("keeps account refreshes passive when account context is missing", () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    let currentTime = 0;
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
      now: () => currentTime,
    });

    expect(runtime.refreshWorldAppContext("app_123")).toBe(false);
    expect(runtime.refreshWorldAppContext("app_123")).toBe(false);
    currentTime = 1_999;
    expect(runtime.refreshWorldAppContext("app_123")).toBe(false);
    currentTime = 2_000;
    expect(runtime.refreshWorldAppContext("app_123")).toBe(false);
    currentTime = 8_000;
    expect(runtime.refreshWorldAppContext("app_123")).toBe(false);

    expect(postMessages).toEqual([]);
    expect(runtime.getWorldRuntimeDiagnostics().worldAppInit).toMatchObject({
      attempted: false,
      success: null,
      attempts: 0,
      transport: "missing",
      stateContainer: "missing",
    });
  });

  it("detects Android transport without sending a native message", () => {
    const postMessages: string[] = [];
    const nativeWindow = asWorldAppWindow({
      Android: {
        postMessage: (payload: string) => postMessages.push(payload),
      },
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    expect(runtime.refreshWorldAppContext("app_123")).toBe(false);

    expect(postMessages).toEqual([]);
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      nativeTransport: true,
      walletAddress: "missing",
      worldAppInit: {
        attempted: false,
        success: null,
        attempts: 0,
        transport: "missing",
        stateContainer: "missing",
      },
    });
  });

  it("detects Android transport when World App reports Android and webkit is also present", () => {
    const iosMessages: unknown[] = [];
    const androidMessages: string[] = [];
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        device_os: "android",
        supported_commands: [
          { name: "verify", supported_versions: [1] },
        ],
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => iosMessages.push(payload),
          },
        },
      },
      Android: {
        postMessage: (payload: string) => androidMessages.push(payload),
      },
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    expect(runtime.refreshWorldAppContext("app_123")).toBe(false);

    expect(iosMessages).toEqual([]);
    expect(androidMessages).toEqual([]);
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      nativeTransport: true,
      deviceOS: null,
      worldAppInit: {
        attempted: false,
        success: null,
        attempts: 0,
        transport: "missing",
        stateContainer: "missing",
      },
    });
  });

  it.each(["MiniKit", "miniKit", "mini-kit", "world_app"] as const)(
    "does not post to alternate iOS handler casing %s",
    (handlerKey) => {
      const postMessages: unknown[] = [];
      const nativeWindow = asWorldAppWindow({
        webkit: {
          messageHandlers: {
            [handlerKey]: {
              postMessage: (payload: unknown) => postMessages.push(payload),
            },
          },
        },
      });
      const runtime = createWorldAppRuntime({
        getWindow: () => nativeWindow,
      });

      expect(runtime.refreshWorldAppContext("app_123")).toBe(false);

      expect(postMessages).toEqual([]);
      expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
        nativeTransport: true,
        walletAddress: "missing",
        worldAppInit: {
          attempted: false,
          success: null,
          attempts: 0,
          transport: "missing",
          stateContainer: "missing",
        },
      });
    },
  );

  it("detects ReactNativeWebView transport without sending a native message", () => {
    const postMessages: string[] = [];
    const nativeWindow = asWorldAppWindow({
      ReactNativeWebView: {
        postMessage: (payload: string) => postMessages.push(payload),
      },
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    expect(runtime.refreshWorldAppContext("app_123")).toBe(false);

    expect(postMessages).toEqual([]);
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      nativeTransport: true,
      walletAddress: "missing",
      worldAppInit: {
        attempted: false,
        success: null,
        attempts: 0,
        transport: "missing",
        stateContainer: "missing",
      },
    });
  });

  it("preserves an existing MiniKit state container without sending init", () => {
    const existingMiniKit = {
      user: {},
      deviceProperties: {
        worldAppVersion: 4001040,
        deviceOS: "ios",
      },
      location: "home" as const,
    };
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        world_app_version: 4001040,
        device_os: "ios",
      },
      MiniKit: existingMiniKit,
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    expect(runtime.refreshWorldAppContext("app_123")).toBe(false);

    expect(nativeWindow.MiniKit).toBe(existingMiniKit);
    expect(nativeWindow.MiniKit).not.toHaveProperty("appId");
    expect(postMessages).toEqual([]);
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppInit: {
        attempted: false,
        success: null,
        attempts: 0,
        transport: "missing",
        stateContainer: "missing",
      },
    });
  });

  it("treats the World App user agent as in-app before bridge injection", async () => {
    const nativeWindow = asWorldAppWindow({
      navigator: {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) WorldApp",
      },
    });
    let currentTime = 0;
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
      now: () => currentTime,
      sleep: async (ms) => {
        currentTime += ms;
      },
    });

    expect(runtime.hasWorldAppRuntime()).toBe(false);
    expect(runtime.hasNativeWorldAppTransport()).toBe(false);
    expect(runtime.hasWorldAppUserAgent()).toBe(true);
    expect(runtime.isInWorldApp()).toBe(true);
    expect(runtime.refreshWorldAppContext("app_123")).toBe(false);
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      worldAppRuntime: false,
      nativeTransport: false,
      worldAppUserAgent: true,
      walletAddress: "missing",
      accountSource: "missing",
      accountSourceDetail: "missing",
      worldAppInit: {
        attempted: false,
        success: null,
        attempts: 0,
        transport: "missing",
        stateContainer: "missing",
      },
    });
    await expect(runtime.waitForWorldAppAccountRuntime("app_123", { timeoutMs: 100 })).rejects.toThrow(
      "World App did not expose your logged-in account.",
    );
  });

  it("does not send init when the logged-in World App account is already present", () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      WorldApp: {
        wallet_address: worldAppAddress,
        world_app_version: 4001000,
        device_os: "ios",
        location: {
          open_origin: "mini-app-listing",
        },
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    expect(runtime.refreshWorldAppContext("app_123")).toBe(true);
    expect(runtime.refreshWorldAppContext("app_123")).toBe(true);
    nativeWindow.WorldApp = {
      ...nativeWindow.WorldApp,
      wallet_address: miniKitAddress,
    };
    expect(runtime.refreshWorldAppContext("app_123")).toBe(true);

    expect(postMessages).toEqual([]);
    expect(runtime.getWorldRuntimeDiagnostics().worldAppInit).toEqual({
      attempted: false,
      success: null,
      attempts: 0,
      transport: "missing",
      stateContainer: "missing",
      errorCode: null,
      errorMessage: null,
    });
  });

  it("does not send native commands before or after config is loaded", () => {
    const postMessages: unknown[] = [];
    const nativeWindow = asWorldAppWindow({
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    const runtime = createWorldAppRuntime({
      getWindow: () => nativeWindow,
    });

    expect(runtime.primeWorldAppRuntime()).toBe(false);
    expect(postMessages).toEqual([]);
    expect(runtime.refreshWorldAppContext("app_123")).toBe(false);

    expect(postMessages).toEqual([]);
  });

  it("fails with the in-app instruction when no World App runtime appears", async () => {
    let currentTime = 0;
    const runtime = createWorldAppRuntime({
      getWindow: () => undefined,
      now: () => currentTime,
      sleep: async (ms) => {
        currentTime += ms;
      },
    });

    await expect(runtime.waitForWorldAppAccountRuntime("app_123", { timeoutMs: 100 })).rejects.toThrow(
      "Open VeriPost in World App",
    );
  });

  it("reads raw World App state without sending MiniKit init when account context is already present", () => {
    const postMessages: unknown[] = [];
    const fakeWindow = asWorldAppWindow({
      WorldApp: {
        wallet_address: worldAppAddress,
        world_app_version: 4001000,
        device_os: "ios",
        verification_status: {
          is_orb_verified: true,
          is_document_verified: true,
          is_secure_document_verified: false,
        },
        location: {
          open_origin: "deeplink",
        },
        supported_commands: worldAppSupportedCommands(),
      },
      webkit: {
        messageHandlers: {
          minikit: {
            postMessage: (payload: unknown) => postMessages.push(payload),
          },
        },
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: fakeWindow,
    });
    const runtime = createWorldAppRuntime({ getWindow: () => fakeWindow });

    expect(runtime.refreshWorldAppContext("app_123")).toBe(true);

    expect(runtime.getWorldAppAccountSource()).toBe("world_app");
    expect(runtime.getWorldRuntimeDiagnostics()).toMatchObject({
      accountSource: "world_app",
      accountSourceDetail: "world_app_flat",
      launchLocation: "deep-link",
      openOrigin: "deeplink",
      miniKitBridge: {
        trigger: false,
        subscribe: false,
        unsubscribe: false,
      },
      worldAppInit: {
        attempted: false,
        success: null,
        attempts: 0,
        transport: "missing",
        stateContainer: "missing",
      },
    });
    expect(postMessages).toEqual([]);
    expect(JSON.stringify(postMessages)).not.toContain("wallet-auth");
    expect(JSON.stringify(postMessages)).not.toContain("sign-message");
    expect(JSON.stringify(postMessages)).not.toContain("sign-typed-data");
  });
});
