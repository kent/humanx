import type { Metadata, Viewport } from "next";

import Providers from "@/app/providers";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "VeriPost",
  description: "Verified human proof for X posts.",
  appleWebApp: {
    capable: true,
    title: "VeriPost",
  },
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
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
