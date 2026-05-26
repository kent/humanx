import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

export const MAX_POST_TEXT_LENGTH = 220;
export const WORLD_ID_ACTION_DEFAULT = "humanx-tweet-proof";

const encoder = new TextEncoder();

export type TextValidation =
  | { ok: true; normalized: string; draftHash: string; signal: string }
  | { ok: false; code: "empty_text" | "text_too_long"; message: string };

export function normalizePostText(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .trim()
    .replace(/\n{3,}/g, "\n\n");
}

export function hashDraftText(normalizedText: string): string {
  return bytesToHex(sha256(encoder.encode(normalizedText)));
}

export function buildWorldSignal(draftHash: string): string {
  return `humanx:v1:${draftHash}`;
}

export function validatePostText(input: string): TextValidation {
  const normalized = normalizePostText(input);

  if (!normalized) {
    return {
      ok: false,
      code: "empty_text",
      message: "Write the X post before creating a proof.",
    };
  }

  if (normalized.length > MAX_POST_TEXT_LENGTH) {
    return {
      ok: false,
      code: "text_too_long",
      message: `Keep the post under ${MAX_POST_TEXT_LENGTH} characters so the proof link fits on X.`,
    };
  }

  const draftHash = hashDraftText(normalized);

  return {
    ok: true,
    normalized,
    draftHash,
    signal: buildWorldSignal(draftHash),
  };
}

export function shortDigest(hex: string, size = 10): string {
  const clean = hex.replace(/^0x/, "");
  return `${clean.slice(0, size)}...${clean.slice(-size)}`;
}
