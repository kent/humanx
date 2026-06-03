import {
  IDKit,
  orbLegacy,
  type IDKitResult,
  type RpContext,
} from "@worldcoin/idkit-core";

import type { WorldEnvironment } from "@/lib/config";

export type WorldIdKitRpContext = RpContext;

export type NativeWorldIdKitProofInput = {
  action: string;
  appId: string;
  environment: WorldEnvironment;
  rpContext: WorldIdKitRpContext;
  signal: string;
  timeoutMs?: number;
};

export type WorldIdKitClientErrorCode =
  | "world_idkit_connector_blocked"
  | "world_idkit_native_failed"
  | "world_idkit_native_unavailable";

type WorldIdKitWindow = Window & {
  WorldApp?: unknown;
  __veripostAllowNativeWorldIdkitVerifyUntil?: number;
};

const WORLD_IDKIT_NATIVE_TIMEOUT_MS = 180_000;
const WORLD_IDKIT_NATIVE_VERIFY_ALLOWANCE_MS = 30_000;

export class WorldIdKitClientError extends Error {
  readonly code: WorldIdKitClientErrorCode;

  constructor(code: WorldIdKitClientErrorCode, message: string) {
    super(message);
    this.name = "WorldIdKitClientError";
    this.code = code;
  }
}

export async function requestNativeWorldIdKitProof(input: NativeWorldIdKitProofInput): Promise<IDKitResult> {
  const nativeWindow = getWorldIdKitWindow();
  if (!nativeWindow?.WorldApp) {
    throw new WorldIdKitClientError(
      "world_idkit_native_unavailable",
      "World App did not expose the in-app World ID proof runtime.",
    );
  }

  const releaseNativeVerifyAllowance = allowNativeWorldIdKitVerifyCommand(nativeWindow);
  let request: Awaited<ReturnType<ReturnType<typeof IDKit.request>["preset"]>>;
  try {
    request = await IDKit.request({
      app_id: input.appId as `app_${string}`,
      action: input.action,
      rp_context: input.rpContext,
      allow_legacy_proofs: true,
      environment: input.environment,
    }).preset(orbLegacy({ signal: input.signal }));
  } finally {
    releaseNativeVerifyAllowance();
  }

  if (request.connectorURI.trim()) {
    throw new WorldIdKitClientError(
      "world_idkit_connector_blocked",
      "World ID verification tried to open an external connector. VeriPost blocked it to stay inside World App.",
    );
  }

  const completion = await request.pollUntilCompletion({
    pollInterval: 1_000,
    timeout: input.timeoutMs ?? WORLD_IDKIT_NATIVE_TIMEOUT_MS,
  });

  if (!completion.success) {
    throw new WorldIdKitClientError(
      "world_idkit_native_failed",
      `World ID proof was not completed (${completion.error}).`,
    );
  }

  return completion.result;
}

export function getWorldIdKitClientErrorCode(error: unknown): WorldIdKitClientErrorCode | null {
  if (!(error instanceof Error)) return null;
  const code = (error as Error & { code?: unknown }).code;
  if (
    code === "world_idkit_connector_blocked" ||
    code === "world_idkit_native_failed" ||
    code === "world_idkit_native_unavailable"
  ) {
    return code;
  }

  return null;
}

function allowNativeWorldIdKitVerifyCommand(nativeWindow: WorldIdKitWindow): () => void {
  const previousAllowance = nativeWindow.__veripostAllowNativeWorldIdkitVerifyUntil;
  const nextAllowance = Date.now() + WORLD_IDKIT_NATIVE_VERIFY_ALLOWANCE_MS;
  nativeWindow.__veripostAllowNativeWorldIdkitVerifyUntil = Math.max(
    typeof previousAllowance === "number" ? previousAllowance : 0,
    nextAllowance,
  );

  return () => {
    if (previousAllowance && previousAllowance > Date.now()) {
      nativeWindow.__veripostAllowNativeWorldIdkitVerifyUntil = previousAllowance;
      return;
    }

    delete nativeWindow.__veripostAllowNativeWorldIdkitVerifyUntil;
  };
}

function getWorldIdKitWindow(): WorldIdKitWindow | null {
  return typeof window === "undefined" ? null : window as WorldIdKitWindow;
}
