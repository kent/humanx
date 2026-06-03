import { describe, expect, it, vi } from "vitest";

import {
  extractTweetText,
  fetchTweetOEmbed,
  parseTweetUrl,
  verifyPostedTweet,
} from "@/lib/x-tweet";

describe("parseTweetUrl", () => {
  it("parses x.com and twitter.com status links", () => {
    expect(parseTweetUrl("https://x.com/kentf/status/1234567890")).toEqual({
      handle: "kentf",
      tweetId: "1234567890",
    });
    expect(parseTweetUrl("https://twitter.com/KentF/status/42/photo/1?s=20")).toEqual({
      handle: "kentf",
      tweetId: "42",
    });
    expect(parseTweetUrl("https://mobile.twitter.com/a_b/statuses/99")).toEqual({
      handle: "a_b",
      tweetId: "99",
    });
  });

  it("rejects non-status, non-https, foreign hosts, and intent links", () => {
    expect(parseTweetUrl("https://x.com/kentf")).toBeNull();
    expect(parseTweetUrl("http://x.com/kentf/status/1")).toBeNull();
    expect(parseTweetUrl("https://evil.com/kentf/status/1")).toBeNull();
    expect(parseTweetUrl("https://x.com/intent/tweet?text=hi")).toBeNull();
    expect(parseTweetUrl("https://x.com/kentf/status/notanid")).toBeNull();
    expect(parseTweetUrl("not a url")).toBeNull();
  });
});

describe("extractTweetText", () => {
  it("strips markup/entities and trailing platform links", () => {
    const html =
      '<blockquote><p lang="en" dir="ltr">Hello verified human world. &amp; friends ' +
      '<a href="https://t.co/abc">pic.twitter.com/abc</a></p>&mdash; Kent</blockquote>';
    expect(extractTweetText(html)).toBe("Hello verified human world. & friends");
  });
});

function oembedResponse(authorHandle: string, html: string): Response {
  return new Response(
    JSON.stringify({ author_url: `https://twitter.com/${authorHandle}`, html }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("verifyPostedTweet", () => {
  const text = "Hello verified human world.";
  const html = `<blockquote><p>${text}</p></blockquote>`;

  it("verifies a matching tweet by the expected author", async () => {
    const fetcher = vi.fn(async () => oembedResponse("kentf", html));
    const result = await verifyPostedTweet("https://x.com/kentf/status/1", text, {
      fetcher,
      requireTextMatch: true,
    });
    expect(result).toMatchObject({ handle: "kentf", tweetId: "1", textMatches: true });
  });

  it("rejects when the oEmbed author differs from the link handle", async () => {
    const fetcher = vi.fn(async () => oembedResponse("someone_else", html));
    await expect(
      verifyPostedTweet("https://x.com/kentf/status/1", text, { fetcher }),
    ).rejects.toThrow("author does not match");
  });

  it("rejects text mismatch when required", async () => {
    const fetcher = vi.fn(async () => oembedResponse("kentf", "<p>totally different text</p>"));
    await expect(
      verifyPostedTweet("https://x.com/kentf/status/1", text, { fetcher, requireTextMatch: true }),
    ).rejects.toThrow("does not match the post");
  });

  it("maps a 404 to tweet_not_found", async () => {
    const fetcher = vi.fn(async () => new Response("", { status: 404 }));
    await expect(
      verifyPostedTweet("https://x.com/kentf/status/1", text, { fetcher }),
    ).rejects.toThrow("could not be found");
  });

  it("rejects an unparseable tweet URL before fetching", async () => {
    const fetcher = vi.fn();
    await expect(verifyPostedTweet("https://x.com/kentf", text, { fetcher })).rejects.toThrow(
      "Paste the link",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("fetchTweetOEmbed", () => {
  it("extracts the author handle from author_url", async () => {
    const fetcher = vi.fn(async () => oembedResponse("kentf", "<p>hi</p>"));
    const result = await fetchTweetOEmbed({ handle: "kentf", tweetId: "1" }, fetcher);
    expect(result.authorHandle).toBe("kentf");
  });
});
