export function buildXIntentUrl(postText: string, proofUrl: string): string {
  const intent = new URL("https://x.com/intent/tweet");
  intent.searchParams.set("text", postText);
  intent.searchParams.set("url", proofUrl);
  return intent.toString();
}

export function normalizeXPostUrl(input: string): string | null {
  let parsed: URL;

  try {
    parsed = new URL(input.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") {
    return null;
  }

  if (!["x.com", "www.x.com", "twitter.com", "www.twitter.com"].includes(parsed.hostname)) {
    return null;
  }

  const match = parsed.pathname.match(/^\/([A-Za-z0-9_]{1,15})\/status\/([0-9]+)\/?$/);
  if (!match) {
    return null;
  }

  return `https://x.com/${match[1]}/status/${match[2]}`;
}

export function isValidXPostUrl(input: string): boolean {
  return normalizeXPostUrl(input) !== null;
}
