import { afterEach, describe, expect, it } from "vitest";

import {
  getWorldServerConfig,
  hasProofStorageConfig,
  missingWorldConfig,
} from "@/lib/config";

afterEach(() => {
  delete process.env.DATABASE_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.POSTGRES_URL;
  delete process.env.VERCEL_ENV;
  delete process.env.WORLD_ID_ENVIRONMENT;
  delete process.env.NEXT_PUBLIC_WORLD_APP_ID;
  delete process.env.WORLD_ID_RP_ID;
  delete process.env.WORLD_ID_RP_SIGNING_KEY;
});

describe("proof storage configuration", () => {
  it("allows local file storage outside Vercel production", () => {
    expect(hasProofStorageConfig()).toBe(true);
  });

  it("requires a database URL in Vercel production", () => {
    process.env.VERCEL_ENV = "production";

    expect(hasProofStorageConfig()).toBe(false);

    process.env.DATABASE_URL = "postgres://user:pass@example.com/db?sslmode=require";

    expect(hasProofStorageConfig()).toBe(true);
  });

  it("requires a database URL for the production launch URL and World environment", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://veripost.io";
    process.env.WORLD_ID_ENVIRONMENT = "production";

    expect(hasProofStorageConfig()).toBe(false);

    process.env.POSTGRES_URL = "postgres://user:pass@example.com/db?sslmode=require";

    expect(hasProofStorageConfig()).toBe(true);
  });
});

describe("World ID proof configuration", () => {
  it("requires app id, RP id, and RP signing key for native IDKit proofs", () => {
    const config = getWorldServerConfig("https://veripost.io");

    expect(missingWorldConfig(config)).toEqual([
      "NEXT_PUBLIC_WORLD_APP_ID",
      "WORLD_ID_RP_ID",
      "WORLD_ID_RP_SIGNING_KEY",
    ]);
  });

  it("accepts complete native IDKit proof configuration", () => {
    process.env.NEXT_PUBLIC_WORLD_APP_ID = "app_123";
    process.env.WORLD_ID_RP_ID = "rp_123";
    process.env.WORLD_ID_RP_SIGNING_KEY = "1".repeat(64);

    expect(missingWorldConfig(getWorldServerConfig("https://veripost.io"))).toEqual([]);
  });
});
