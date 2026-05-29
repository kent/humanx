import { afterEach, describe, expect, it } from "vitest";

import { hasProofStorageConfig } from "@/lib/config";

afterEach(() => {
  delete process.env.DATABASE_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.POSTGRES_URL;
  delete process.env.VERCEL_ENV;
  delete process.env.WORLD_ID_ENVIRONMENT;
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
