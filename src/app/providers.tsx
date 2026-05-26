"use client";

import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <MiniKitProvider>{children}</MiniKitProvider>
    </SessionProvider>
  );
}
