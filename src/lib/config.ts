import { WORLD_ID_ACTION_DEFAULT } from "@/lib/text";
import { ApiError } from "@/lib/http";

export type WorldEnvironment = "production" | "staging";

export type WorldServerConfig = {
  appId: string;
  rpId: string;
  rpSigningKey: string;
  action: string;
  environment: WorldEnvironment;
  appUrl: string;
  supportEmail: string;
};

export type PublicAppConfig = {
  appId: string;
  action: string;
  environment: WorldEnvironment;
  appUrl: string;
  supportEmail: string;
  hasWorldConfig: boolean;
  hasProofStorageConfig: boolean;
  maxPostTextLength: number;
};

export function getWorldEnvironment(): WorldEnvironment {
  return process.env.WORLD_ID_ENVIRONMENT === "staging" ? "staging" : "production";
}

export function getWorldServerConfig(origin = ""): WorldServerConfig {
  return {
    appId: process.env.NEXT_PUBLIC_WORLD_APP_ID ?? "",
    rpId: process.env.WORLD_ID_RP_ID ?? "",
    rpSigningKey: process.env.WORLD_ID_RP_SIGNING_KEY ?? "",
    action: process.env.WORLD_ID_ACTION ?? WORLD_ID_ACTION_DEFAULT,
    environment: getWorldEnvironment(),
    appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? origin).replace(/\/$/, ""),
    supportEmail: process.env.SUPPORT_EMAIL ?? "",
  };
}

export function missingWorldConfig(config: WorldServerConfig): string[] {
  const missing: string[] = [];

  if (!config.appId.trim()) missing.push("NEXT_PUBLIC_WORLD_APP_ID");
  if (!config.rpId.trim()) missing.push("WORLD_ID_RP_ID");
  if (!config.rpSigningKey.trim()) missing.push("WORLD_ID_RP_SIGNING_KEY");

  return missing;
}

export function hasDatabaseProofStorageConfig(): boolean {
  return Boolean(process.env.POSTGRES_URL?.trim() || process.env.DATABASE_URL?.trim());
}

export function isProductionLaunchRuntime(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.WORLD_ID_ENVIRONMENT === "production" ||
    process.env.NEXT_PUBLIC_APP_URL === "https://veripost.io"
  );
}

export function hasProofStorageConfig(): boolean {
  const hasDatabaseUrl = hasDatabaseProofStorageConfig();

  if (!isProductionLaunchRuntime()) {
    return true;
  }

  return hasDatabaseUrl;
}

export function assertProofStorageConfig(): void {
  if (hasProofStorageConfig()) return;

  throw new ApiError(503, "storage_not_configured", "Proof storage is not configured.", {
    missing: ["POSTGRES_URL", "DATABASE_URL"],
  });
}

export function getRequestOrigin(request: Request): string {
  const url = new URL(request.url);
  return url.origin;
}
