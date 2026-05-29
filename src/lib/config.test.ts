import { afterEach, describe, expect, it } from "vitest";

import { hasProofStorageConfig } from "@/lib/config";

afterEach(() => {
  delete process.env.DATABASE_URL;
  delete process.env.POSTGRES_URL;
  delete process.env.VERCEL_ENV;
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
});
