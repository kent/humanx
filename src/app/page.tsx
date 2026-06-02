import { headers } from "next/headers";

import ComposeFlow from "@/components/compose-flow";
import { getRedactedLaunchQuery, type PageSearchParamsInput, type RedactedLaunchQuery } from "@/lib/redacted-launch-query";
import { WORLD_APP_FLOW_VERSION } from "@/lib/world-app-runtime";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

type HeaderOriginState = "same" | "other" | "missing" | "invalid";
type HomeProps = {
  searchParams?: PageSearchParamsInput | Promise<PageSearchParamsInput>;
};

export default async function Home({ searchParams }: HomeProps = {}) {
  const [requestHeaders, resolvedSearchParams] = await Promise.all([
    headers(),
    resolveSearchParams(searchParams),
  ]);
  reportWorldPageRequest(requestHeaders, getRedactedLaunchQuery(resolvedSearchParams));

  return <ComposeFlow />;
}

async function resolveSearchParams(
  searchParams: HomeProps["searchParams"],
): Promise<PageSearchParamsInput | undefined> {
  return searchParams ? await searchParams : undefined;
}

function reportWorldPageRequest(requestHeaders: Headers, launchQuery: RedactedLaunchQuery): void {
  const expectedOrigin = getExpectedOrigin(requestHeaders);
  const userAgent = requestHeaders.get("user-agent") ?? "";

  console.info(
    "world_page_request",
    JSON.stringify({
      receivedAt: new Date().toISOString(),
      flowVersion: WORLD_APP_FLOW_VERSION,
      request: {
        host: safeHost(requestHeaders.get("host")),
        provenance: {
          origin: classifyHeaderOrigin(requestHeaders.get("origin"), expectedOrigin),
          referer: classifyHeaderOrigin(requestHeaders.get("referer"), expectedOrigin),
          secFetchSite: safeFetchHeader(requestHeaders.get("sec-fetch-site")),
          secFetchMode: safeFetchHeader(requestHeaders.get("sec-fetch-mode")),
          secFetchDest: safeFetchHeader(requestHeaders.get("sec-fetch-dest")),
        },
        userAgent: {
          worldApp: /world ?app|worldcoin/i.test(userAgent),
          ios: /iphone|ipad|ipod/i.test(userAgent),
          android: /android/i.test(userAgent),
          mobile: /mobile|iphone|ipad|ipod|android/i.test(userAgent),
          safari: /safari/i.test(userAgent) && !/chrome|chromium|crios|fxios/i.test(userAgent),
          chrome: /chrome|chromium|crios/i.test(userAgent),
        },
        launch: {
          query: launchQuery,
        },
      },
    }),
  );
}

function getExpectedOrigin(requestHeaders: Headers): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return new URL(process.env.NEXT_PUBLIC_APP_URL).origin;
  }

  const host = requestHeaders.get("host") || "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";
  return `${protocol}://${host}`;
}

function classifyHeaderOrigin(value: string | null, expectedOrigin: string): HeaderOriginState {
  if (!value) return "missing";

  try {
    return new URL(value).origin === expectedOrigin ? "same" : "other";
  } catch {
    return "invalid";
  }
}

function safeFetchHeader(value: string | null): string | null {
  if (!value || !/^[a-z0-9_-]{1,40}$/i.test(value)) return null;
  return value;
}

function safeHost(value: string | null): string | null {
  if (!value || !/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(value)) return null;
  return value.toLowerCase();
}
