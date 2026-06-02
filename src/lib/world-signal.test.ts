import { describe, expect, it } from "vitest";

import { hashSignalToField } from "@/lib/world-signal";

describe("World signal hashing", () => {
  it("hashes a VeriPost signal into a World-compatible field element", () => {
    expect(hashSignalToField(`veripost:v1:${"a".repeat(64)}`)).toBe(
      "0x00bda72825d8d244efc3dd99ff3a54ef84081c12f2da2ff4ab3e33bcf1e9fab9",
    );
  });
});
