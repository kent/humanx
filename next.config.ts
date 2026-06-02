import type { NextConfig } from "next";

const noStoreHeaders = [
  {
    key: "Cache-Control",
    value: "no-store, max-age=0, must-revalidate",
  },
  {
    key: "Pragma",
    value: "no-cache",
  },
  {
    key: "Expires",
    value: "0",
  },
  {
    key: "X-VeriPost-Flow",
    value: "world-miniapp-idkit-native-2026-06-01",
  },
];

const inAppNavigationCsp =
  "navigate-to 'self' https://x.com/intent/tweet https://twitter.com/intent/tweet mailto:; form-action 'self'";

const inAppNavigationHeaders = [
  {
    key: "Content-Security-Policy",
    value: inAppNavigationCsp,
  },
];

const staleFlowPurgeHeaders = [
  ...noStoreHeaders,
  ...inAppNavigationHeaders,
  {
    key: "Clear-Site-Data",
    value: '"cache", "cookies", "storage"',
  },
];

const serviceWorkerPurgeHeaders = [
  ...staleFlowPurgeHeaders,
  {
    key: "Service-Worker-Allowed",
    value: "/",
  },
];

const apiHeaders = [
  ...noStoreHeaders,
  ...inAppNavigationHeaders,
];

const manifestHeaders = [
  ...noStoreHeaders,
  ...inAppNavigationHeaders,
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/",
        headers: staleFlowPurgeHeaders,
      },
      {
        source: "/privacy",
        headers: staleFlowPurgeHeaders,
      },
      {
        source: "/support",
        headers: staleFlowPurgeHeaders,
      },
      {
        source: "/manifest.json",
        headers: manifestHeaders,
      },
      {
        source: "/proof/:path*",
        headers: staleFlowPurgeHeaders,
      },
      {
        source: "/sw.js",
        headers: serviceWorkerPurgeHeaders,
      },
      {
        source: "/service-worker.js",
        headers: serviceWorkerPurgeHeaders,
      },
      {
        source: "/api/:path*",
        headers: apiHeaders,
      },
    ];
  },
};

export default nextConfig;
