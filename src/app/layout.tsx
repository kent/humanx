import type { Metadata, Viewport } from "next";

import "@/app/globals.css";
import { EARLY_IN_APP_NAVIGATION_GUARD_SCRIPT } from "@/lib/early-navigation-guard-script";

const appDescription =
  "Create a proof for an X post from your logged-in World App account, with no separate sign-in.";

export const metadata: Metadata = {
  metadataBase: new URL("https://veripost.io"),
  title: "VeriPost",
  description: appDescription,
  openGraph: {
    title: "VeriPost",
    description: appDescription,
    url: "https://veripost.io",
    siteName: "VeriPost",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "VeriPost",
    description: appDescription,
  },
  appleWebApp: {
    capable: true,
    title: "VeriPost",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/app-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f5ef",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          id="veripost-early-navigation-guard"
          dangerouslySetInnerHTML={{ __html: EARLY_IN_APP_NAVIGATION_GUARD_SCRIPT }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
