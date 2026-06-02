import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

const scriptPath = path.join(process.cwd(), "scripts/check-production-env.mjs");
const baseEnv: NodeJS.ProcessEnv = {
  ...process.env,
  DATABASE_URL: "postgres://user:pass@example.com/db?sslmode=require",
  NEXT_PUBLIC_APP_URL: "https://veripost.io",
  NEXT_PUBLIC_WORLD_APP_ID: "app_123",
  WORLD_ID_ACTION: "veripost-tweet-proof",
  WORLD_ID_ENVIRONMENT: "production",
  WORLD_ID_RP_ID: "rp_123",
  WORLD_ID_RP_SIGNING_KEY: "1".repeat(64),
  VERIPOST_SKIP_ENV_FILE_LOAD: "1",
};

function runPreflight(env: NodeJS.ProcessEnv, cwd = process.cwd()): string {
  return execFileSync(process.execPath, [scriptPath], {
    encoding: "utf8",
    env,
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runPreflightFailure(env: NodeJS.ProcessEnv): string {
  try {
    runPreflight(env);
  } catch (error) {
    const failure = error as { stderr?: Buffer | string; stdout?: Buffer | string; message?: string };
    return [
      failure.stderr?.toString(),
      failure.stdout?.toString(),
      failure.message,
    ].filter(Boolean).join("\n");
  }

  throw new Error("Preflight unexpectedly passed.");
}

describe("production deploy preflight", () => {
  it("passes with complete native IDKit production configuration", () => {
    expect(runPreflight(baseEnv)).toContain("Production deploy preflight passed.");
  });

  it("loads pulled production env before validating", () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "veripost-env-"));
    const env = { ...process.env };
    for (const name of [
      "DATABASE_URL",
      "POSTGRES_URL",
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_WORLD_APP_ID",
      "WORLD_ID_ACTION",
      "WORLD_ID_ENVIRONMENT",
      "WORLD_ID_RP_ID",
      "WORLD_ID_RP_SIGNING_KEY",
      "VERIPOST_SKIP_ENV_FILE_LOAD",
    ]) {
      delete env[name];
    }

    writeFileSync(path.join(cwd, ".env.production.local"), [
      "DATABASE_URL=postgres://user:pass@example.com/db?sslmode=require",
      "NEXT_PUBLIC_APP_URL=https://veripost.io",
      "NEXT_PUBLIC_WORLD_APP_ID=app_123",
      "WORLD_ID_ACTION=veripost-tweet-proof",
      "WORLD_ID_ENVIRONMENT=production",
      "WORLD_ID_RP_ID=rp_123",
      `WORLD_ID_RP_SIGNING_KEY=${"1".repeat(64)}`,
      "",
    ].join("\n"));

    try {
      expect(runPreflight(env, cwd)).toContain("Production deploy preflight passed.");
    } finally {
      rmSync(cwd, { force: true, recursive: true });
    }
  });

  it("accepts Vercel-managed secrets declared without pullable local values", () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "veripost-env-"));
    const env = { ...process.env };
    for (const name of [
      "DATABASE_URL",
      "POSTGRES_URL",
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_WORLD_APP_ID",
      "WORLD_ID_ACTION",
      "WORLD_ID_ENVIRONMENT",
      "WORLD_ID_RP_ID",
      "WORLD_ID_RP_SIGNING_KEY",
      "VERIPOST_SKIP_ENV_FILE_LOAD",
    ]) {
      delete env[name];
    }

    writeFileSync(path.join(cwd, ".env.production.local"), [
      "DATABASE_URL=",
      "NEXT_PUBLIC_APP_URL=https://veripost.io",
      "NEXT_PUBLIC_WORLD_APP_ID=app_123",
      "WORLD_ID_ACTION=veripost-tweet-proof",
      "WORLD_ID_ENVIRONMENT=production",
      "WORLD_ID_RP_ID=rp_123",
      "WORLD_ID_RP_SIGNING_KEY=",
      "",
    ].join("\n"));

    try {
      const output = runPreflight(env, cwd);
      expect(output).toContain("Production deploy preflight passed.");
      expect(output).toContain("Vercel-managed values present but not readable locally");
    } finally {
      rmSync(cwd, { force: true, recursive: true });
    }
  });

  it("fails without World RP credentials", () => {
    const env = { ...baseEnv };
    delete env.WORLD_ID_RP_ID;
    delete env.WORLD_ID_RP_SIGNING_KEY;

    const output = runPreflightFailure(env);
    expect(output).toContain("WORLD_ID_RP_ID");
    expect(output).toContain("WORLD_ID_RP_SIGNING_KEY");
  });

  it("fails with an invalid RP signing key", () => {
    expect(runPreflightFailure({
      ...baseEnv,
      WORLD_ID_RP_SIGNING_KEY: "not-a-private-key",
    })).toContain("32-byte hex private key");
  });
});
