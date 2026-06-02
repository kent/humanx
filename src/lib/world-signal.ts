import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex } from "@noble/hashes/utils.js";

const encoder = new TextEncoder();

export function hashSignalToField(signal: string): string {
  const digest = keccak_256(encoder.encode(signal));
  const fieldValue = BigInt(`0x${bytesToHex(digest)}`) >> 8n;
  return `0x${fieldValue.toString(16).padStart(64, "0")}`;
}
