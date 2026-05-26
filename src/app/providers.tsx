"use client";

import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return <MiniKitProvider>{children}</MiniKitProvider>;
}
