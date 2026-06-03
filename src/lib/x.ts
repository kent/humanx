const X_USERNAME_PATTERN = /^[A-Za-z0-9_]{1,15}$/;

export function buildXIntentUrl(postText: string, proofUrl: string): string {
  const intent = new URL("https://x.com/intent/tweet");
  intent.searchParams.set("text", postText);
  intent.searchParams.set("url", proofUrl);
  return intent.toString();
}

// Intent for the first phase: post the bare text on X (no proof link yet — the
// proof is created afterwards and bound to the resulting tweet).
export function buildXTextIntentUrl(postText: string): string {
  const intent = new URL("https://x.com/intent/tweet");
  intent.searchParams.set("text", postText);
  return intent.toString();
}

export function normalizeXUsername(value: string | null | undefined): string | null {
  const username = value?.trim().replace(/^@/, "");
  if (!username || !X_USERNAME_PATTERN.test(username)) return null;
  return username.toLowerCase();
}
