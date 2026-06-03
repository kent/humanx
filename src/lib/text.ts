import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

export const MAX_POST_TEXT_LENGTH = 220;
export const WORLD_ID_ACTION_DEFAULT = "veripost-tweet-proof";

const encoder = new TextEncoder();

export type TextValidation =
  | { ok: true; normalized: string; draftHash: string; signal: string }
  | { ok: false; code: "empty_text" | "text_too_long"; message: string };

// Removes characters that are invisible to a human reader but would change the
// hash: C0/C1 control chars (keeping tab 0x09, newline 0x0A, carriage return
// 0x0D), DEL, soft hyphen, bidi marks, zero-width chars/joiners, word joiner,
// and BOM. Done by code point so the source stays plain ASCII.
function stripInvisibleChars(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0;
    if (code === 0x09 || code === 0x0a || code === 0x0d) {
      out += ch;
      continue;
    }
    if (code <= 0x1f || code === 0x7f) continue;
    if (code === 0x00ad) continue; // soft hyphen
    if (code >= 0x200b && code <= 0x200f) continue; // zero-width + bidi marks
    if (code === 0x2060 || code === 0xfeff) continue; // word joiner, BOM/ZWNBSP
    out += ch;
  }
  return out;
}

export function normalizePostText(input: string): string {
  // Canonicalize composed characters so visually identical text hashes alike,
  // then strip invisibles before whitespace normalization.
  return stripInvisibleChars(input.normalize("NFC"))
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
  return `veripost:v1:${draftHash}`;
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
