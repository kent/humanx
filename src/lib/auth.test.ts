import type { Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { TwitterProfile } from "next-auth/providers/twitter";
import { describe, expect, it } from "vitest";

import { authOptions } from "@/lib/auth";

type JwtCallback = NonNullable<NonNullable<typeof authOptions.callbacks>["jwt"]>;
type SessionCallback = NonNullable<NonNullable<typeof authOptions.callbacks>["session"]>;

const user: User = {
  id: "123",
  name: "Alice",
  email: null,
  image: null,
};

function makeTwitterProfile(username: string): TwitterProfile {
  return {
    data: {
      id: "123",
      name: "Alice",
      username,
      profile_image_url: "https://example.com/alice.jpg",
    },
  } as TwitterProfile;
}

describe("X auth username handling", () => {
  it("normalizes the X profile username into the JWT", async () => {
    const callback = authOptions.callbacks?.jwt;
    if (!callback) throw new Error("Missing JWT callback");

    const token = await callback({
      token: {},
      user,
      account: null,
      profile: makeTwitterProfile("@Alice"),
    } as Parameters<JwtCallback>[0]);

    expect(token.username).toBe("alice");
  });

  it("normalizes an existing token username into the session", async () => {
    const callback = authOptions.callbacks?.session;
    if (!callback) throw new Error("Missing session callback");

    const session = await callback({
      session: {
        user: { name: "Alice", email: null, image: null },
        expires: new Date("2026-05-26T17:20:00.000Z").toISOString(),
      } satisfies Session,
      token: { username: "@Alice" } satisfies JWT,
    } as Parameters<SessionCallback>[0]);

    expect((session as Session).user?.username).toBe("alice");
  });

  it("removes invalid token usernames from the session", async () => {
    const callback = authOptions.callbacks?.session;
    if (!callback) throw new Error("Missing session callback");

    const session = await callback({
      session: {
        user: { name: "Alice", email: null, image: null },
        expires: new Date("2026-05-26T17:20:00.000Z").toISOString(),
      } satisfies Session,
      token: { username: "alice.example" } satisfies JWT,
    } as Parameters<SessionCallback>[0]);

    expect((session as Session).user?.username).toBeUndefined();
  });
});
