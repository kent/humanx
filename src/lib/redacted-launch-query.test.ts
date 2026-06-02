import { describe, expect, it } from "vitest";

import { getRedactedLaunchQuery, isLegacyAuthTriggerQueryKey } from "@/lib/redacted-launch-query";

describe("redacted launch query", () => {
  it("reports launch query shape without exposing values", () => {
    const query = getRedactedLaunchQuery(
      new URLSearchParams(
        "path=%2F&callbackUrl=&auth&state=https%3A%2F%2Fx.com%2Fi%2Foauth2%2Fauthorize%3Fclient_id%3Dsecret&bad%20key=secret",
      ),
    );

    expect(query).toMatchObject({
      hasQuery: true,
      keyCount: 5,
      queryKeys: ["path", "callbackUrl", "auth", "state", "invalid"],
      emptyValueKeys: ["callbackUrl", "auth"],
      legacyQueryKeys: ["path", "callbackUrl", "state"],
      authTriggerKeys: ["auth"],
      authReturnKeys: ["callbackUrl"],
      externalHandoffKeys: ["path", "state"],
      safeRootPathHandoff: true,
    });
    expect(JSON.stringify(query)).not.toContain("client_id");
    expect(JSON.stringify(query)).not.toContain("secret");
    expect(JSON.stringify(query)).not.toContain("x.com");
  });

  it("classifies common stale auth trigger key variants", () => {
    expect(isLegacyAuthTriggerQueryKey("walletAuth")).toBe(true);
    expect(isLegacyAuthTriggerQueryKey("world_wallet_auth")).toBe(true);
    expect(isLegacyAuthTriggerQueryKey("authorize")).toBe(true);
    expect(isLegacyAuthTriggerQueryKey("logIn")).toBe(true);
    expect(isLegacyAuthTriggerQueryKey("sign_in")).toBe(true);
    expect(isLegacyAuthTriggerQueryKey("loginWithX")).toBe(true);
    expect(isLegacyAuthTriggerQueryKey("oauth_callback")).toBe(true);
    expect(isLegacyAuthTriggerQueryKey("worldSignIn")).toBe(true);
    expect(isLegacyAuthTriggerQueryKey("xLogin")).toBe(true);
    expect(isLegacyAuthTriggerQueryKey("proof-session")).toBe(true);
    expect(isLegacyAuthTriggerQueryKey("sourceAppId")).toBe(false);
  });
});
