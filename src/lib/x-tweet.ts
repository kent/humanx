import { ApiError } from "@/lib/http";
import { normalizePostText } from "@/lib/text";

// Parses and verifies a posted tweet so a World ID proof can be bound to it.
// Uses X's unauthenticated oEmbed endpoint (no API credentials needed) to
// confirm the tweet exists and is authored by the handle in its URL.

export type ParsedTweet = {
  handle: string; // lowercased, no leading @
  tweetId: string;
};

export type VerifiedTweet = ParsedTweet & {
  tweetText: string; // best-effort plain text extracted from oEmbed
  textMatches: boolean; // whether the tweet text matches the proved post text
};

const TWEET_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
  "mobile.twitter.com",
  "mobile.x.com",
]);
const HANDLE_PATTERN = /^[A-Za-z0-9_]{1,15}$/;
const TWEET_ID_PATTERN = /^\d{1,25}$/;
const OEMBED_ENDPOINT = "https://publish.twitter.com/oembed";

export function parseTweetUrl(input: string): ParsedTweet | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !TWEET_HOSTS.has(url.hostname.toLowerCase())) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  // Expect <handle>/status(es)/<id>[/...]
  const statusIndex = segments.findIndex((s) => s === "status" || s === "statuses");
  if (statusIndex !== 1) return null;

  const handle = segments[0]?.toLowerCase();
  const tweetId = segments[statusIndex + 1];
  if (!handle || !HANDLE_PATTERN.test(handle) || handle === "i" || handle === "intent") return null;
  if (!tweetId || !TWEET_ID_PATTERN.test(tweetId)) return null;

  return { handle, tweetId };
}

export function canonicalTweetUrl(parsed: ParsedTweet): string {
  return `https://x.com/${parsed.handle}/status/${parsed.tweetId}`;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

// oEmbed returns the tweet body inside a <blockquote><p>…</p>. Links (incl. the
// trailing t.co status/media link) are <a> tags; we drop trailing links so an
// appended proof URL or media link does not break the text comparison.
export function extractTweetText(oembedHtml: string): string {
  const paragraph = oembedHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  const inner = paragraph ? paragraph[1] : oembedHtml;
  const withBreaks = inner.replace(/<br\s*\/?>(\n)?/gi, "\n");
  const withoutTags = withBreaks.replace(/<[^>]+>/g, "");
  const decoded = decodeHtmlEntities(withoutTags);
  // Strip trailing pic.twitter / t.co / https links the platform appends.
  const withoutTrailingLinks = decoded.replace(/\s*(?:https?:\/\/\S+|pic\.twitter\.com\/\S+)\s*$/i, "");
  return normalizePostText(withoutTrailingLinks);
}

function postTextMatches(tweetText: string, normalizedPostText: string): boolean {
  if (!tweetText) return false;
  if (tweetText === normalizedPostText) return true;
  // Tolerate an appended proof link / hashtags after the proved text.
  return tweetText.startsWith(normalizedPostText);
}

export async function fetchTweetOEmbed(
  parsed: ParsedTweet,
  fetcher: typeof fetch = fetch,
): Promise<{ authorHandle: string; tweetText: string }> {
  const endpoint = new URL(OEMBED_ENDPOINT);
  endpoint.searchParams.set("url", canonicalTweetUrl(parsed));
  endpoint.searchParams.set("omit_script", "1");
  endpoint.searchParams.set("dnt", "true");

  let response: Response;
  try {
    response = await fetcher(endpoint.toString(), { headers: { accept: "application/json" } });
  } catch (error) {
    throw new ApiError(502, "tweet_unreachable", "Could not reach X to verify the post.", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  if (response.status === 404) {
    throw new ApiError(404, "tweet_not_found", "That post could not be found on X. Check the link.");
  }
  if (!response.ok) {
    throw new ApiError(502, "tweet_unreachable", "X did not confirm that post. Try again.");
  }

  const payload = (await response.json().catch(() => null)) as
    | { author_url?: string; html?: string }
    | null;
  if (!payload?.author_url) {
    throw new ApiError(502, "tweet_unreachable", "X returned an unexpected response for that post.");
  }

  const authorHandle = payload.author_url.split("/").filter(Boolean).pop()?.toLowerCase() ?? "";
  return {
    authorHandle,
    tweetText: payload.html ? extractTweetText(payload.html) : "",
  };
}

// Verifies a posted tweet for binding. `requireTextMatch` is enforced at proof
// issuance (so the proof binds to what was actually posted); the public
// verifier can run with it off to report the comparison rather than reject.
export async function verifyPostedTweet(
  tweetUrl: string,
  normalizedPostText: string,
  options: { fetcher?: typeof fetch; requireTextMatch?: boolean } = {},
): Promise<VerifiedTweet> {
  const parsed = parseTweetUrl(tweetUrl);
  if (!parsed) {
    throw new ApiError(400, "tweet_url_invalid", "Paste the link to your X post (x.com/<you>/status/…).");
  }

  const { authorHandle, tweetText } = await fetchTweetOEmbed(parsed, options.fetcher);
  if (authorHandle !== parsed.handle) {
    throw new ApiError(400, "tweet_author_mismatch", "That post's author does not match the link.");
  }

  const textMatches = postTextMatches(tweetText, normalizedPostText);
  // Only enforce when the platform actually gave us text to compare; if oEmbed
  // omits the body we still bind to the verified (handle, tweetId).
  if (options.requireTextMatch && tweetText && !textMatches) {
    throw new ApiError(400, "tweet_text_mismatch", "Your X post text does not match the post you proved.");
  }

  return { handle: parsed.handle, tweetId: parsed.tweetId, tweetText, textMatches };
}
