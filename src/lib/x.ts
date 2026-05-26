export function buildXIntentUrl(postText: string, proofUrl: string): string {
  const intent = new URL("https://x.com/intent/tweet");
  intent.searchParams.set("text", postText);
  intent.searchParams.set("url", proofUrl);
  return intent.toString();
}
