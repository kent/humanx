import { WORLD_ID_ACTION_DEFAULT } from "@/lib/text";
import { hasXAuthConfig } from "@/lib/auth";
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
  hasXAuthConfig: boolean;
  hasProofStorageConfig: boolean;
  maxPostTextLength: number;
};

export function getWorldEnvironment(): WorldEnvironment {
  return process.env.WORLD_ID_ENVIRONMENT === "staging" ? "staging" : "production";
}

export function getWorldServerConfig(origin = ""): WorldServerConfig {
  return {
    appId: process.env.NEXT_PUBLIC_WORLD_APP_ID ?? "",
    rpId: process.env.WORLD_RP_ID ?? "",
    rpSigningKey: process.env.WORLD_RP_SIGNING_KEY ?? "",
    action: process.env.WORLD_ID_ACTION ?? WORLD_ID_ACTION_DEFAULT,
    environment: getWorldEnvironment(),
    appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? origin).replace(/\/$/, ""),
    supportEmail: process.env.SUPPORT_EMAIL ?? "",
  };
}

export function hasWorldVerificationConfig(config: WorldServerConfig): boolean {
  return Boolean(config.appId && config.rpId && config.rpSigningKey);
}

export function hasXLoginConfig(): boolean {
  return hasXAuthConfig();
}

export function hasProofStorageConfig(): boolean {
  if (process.env.VERCEL_ENV !== "production") {
    return true;
  }

  return Boolean(process.env.POSTGRES_URL?.trim() || process.env.DATABASE_URL?.trim());
}

export function assertProofStorageConfig(): void {
  if (hasProofStorageConfig()) return;

  throw new ApiError(503, "storage_not_configured", "Proof storage is not configured.", {
    missing: ["POSTGRES_URL", "DATABASE_URL"],
  });
}

export function missingWorldConfig(config: WorldServerConfig): string[] {
  const missing: string[] = [];
  if (!config.appId) missing.push("NEXT_PUBLIC_WORLD_APP_ID");
  if (!config.rpId) missing.push("WORLD_RP_ID");
  if (!config.rpSigningKey) missing.push("WORLD_RP_SIGNING_KEY");
  return missing;
}

export function getRequestOrigin(request: Request): string {
  const url = new URL(request.url);
  return url.origin;
}
