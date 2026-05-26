const X_USERNAME_PATTERN = /^[A-Za-z0-9_]{1,15}$/;

export function buildXIntentUrl(postText: string, proofUrl: string): string {
  const intent = new URL("https://x.com/intent/tweet");
  intent.searchParams.set("text", postText);
  intent.searchParams.set("url", proofUrl);
  return intent.toString();
}

export function normalizeXUsername(value: string | null | undefined): string | null {
  const username = value?.trim().replace(/^@/, "");
  if (!username || !X_USERNAME_PATTERN.test(username)) return null;
  return username.toLowerCase();
}
