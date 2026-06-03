import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET } from "@/app/api/x-connect/status/route";
import { createXSessionCookie } from "@/lib/x-oauth";
import { putPendingXConnection, resetPendingXConnectionsForTests } from "@/lib/x-connect-store";

const LINK = "link-code-abcdef0123456789";

function statusRequest(code: string | null): Request {
  const url = code === null
    ? "https://veripost.io/api/x-connect/status"
    : `https://veripost.io/api/x-connect/status?code=${encodeURIComponent(code)}`;
  return new Request(url);
}

beforeEach(() => {
  resetPendingXConnectionsForTests();
  process.env.VERIPOST_BINDING_SECRET = "test-secret";
  delete process.env.POSTGRES_URL;
  delete process.env.DATABASE_URL;
});

afterEach(() => {
  delete process.env.VERIPOST_BINDING_SECRET;
});

describe("x-connect status (claim) route", () => {
  it("reports not connected until a pending session is stashed", async () => {
    const response = await GET(statusRequest(LINK));
    await expect(response.json()).resolves.toEqual({ connected: false });
  });

  it("rejects a malformed link code", async () => {
    const response = await GET(statusRequest("short"));
    expect(response.status).toBe(400);
  });

  it("claims the session once: sets the cookie + returns the handle, then is gone", async () => {
    await putPendingXConnection(LINK, createXSessionCookie({ xUserId: "42", handle: "kentf", accessToken: "tok" }));

    const first = await GET(statusRequest(LINK));
    await expect(first.json()).resolves.toEqual({ connected: true, handle: "kentf" });
    expect(first.headers.get("set-cookie") ?? "").toContain("vp_x_session=");

    // One-time: the second poll no longer finds it.
    const second = await GET(statusRequest(LINK));
    await expect(second.json()).resolves.toEqual({ connected: false });
  });
});
