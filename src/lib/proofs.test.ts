import { rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createOrRefreshProof, getStorePath, readProofStore } from "@/lib/proofs";

let dataFile = "";

beforeEach(() => {
  dataFile = `test-${randomUUID()}.json`;
  process.env.HUMANX_DATA_FILE = dataFile;
});

afterEach(async () => {
  delete process.env.HUMANX_DATA_FILE;
  await rm(path.join(process.cwd(), ".data", dataFile), { force: true });
});

describe("proof store", () => {
  it("keeps configured store files scoped under .data", () => {
    process.env.HUMANX_DATA_FILE = ".data/custom-proof-store.json";

    expect(getStorePath()).toBe(path.join(process.cwd(), ".data", "custom-proof-store.json"));
  });

  it("creates proofs without exposing nullifiers publicly", async () => {
    const result = await createOrRefreshProof({
      action: "humanx-tweet-proof",
      environment: "production",
      draftText: "Human proof for this post",
      draftHash: "a".repeat(64),
      signal: `humanx:v1:${"a".repeat(64)}`,
      signalHash: `0x${"b".repeat(64)}`,
      xUsername: "alice",
      nullifierDecimal: "123",
      worldVerification: {
        verifiedAt: "2026-05-26T15:00:00.000Z",
      },
    });

    expect(result.createdNew).toBe(true);
    expect(result.proof.id).toMatch(/^hx_/);
    expect(result.proof.xUsername).toBe("alice");
    expect("nullifierDecimal" in result.proof).toBe(false);

    const store = await readProofStore();
    expect(store.proofs).toHaveLength(1);
    expect(store.proofs[0].nullifierDecimal).toBe("123");
  });

  it("refreshes duplicate proofs without creating another public proof", async () => {
    const first = await createOrRefreshProof({
      action: "humanx-tweet-proof",
      environment: "production",
      draftText: "Human proof for this post",
      draftHash: "a".repeat(64),
      signal: `humanx:v1:${"a".repeat(64)}`,
      signalHash: `0x${"b".repeat(64)}`,
      xUsername: "alice",
      nullifierDecimal: "123",
      worldVerification: {
        verifiedAt: "2026-05-26T15:00:00.000Z",
      },
    });

    const second = await createOrRefreshProof({
      action: "humanx-tweet-proof",
      environment: "production",
      draftText: "Human proof for this post",
      draftHash: "a".repeat(64),
      signal: `humanx:v1:${"a".repeat(64)}`,
      signalHash: `0x${"b".repeat(64)}`,
      xUsername: "alice",
      nullifierDecimal: "123",
      worldVerification: {
        verifiedAt: "2026-05-26T15:01:00.000Z",
      },
    });

    expect(second.createdNew).toBe(false);
    expect(second.proof.id).toBe(first.proof.id);
    expect(second.proof.xUsername).toBe("alice");

    const store = await readProofStore();
    expect(store.proofs).toHaveLength(1);
  });
});
