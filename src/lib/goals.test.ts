import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(filePath: string): string {
  return readFileSync(path.join(process.cwd(), filePath), "utf8");
}

describe("GOALS.md contract", () => {
  it("keeps the product scope to the five simple user stories", () => {
    expect(readProjectFile("GOALS.md")).toBe(`# humanx

## User Stories

1. Load app.
2. Login with X.
3. Press post and enter text to post.
4. Sign with World ID.
5. Post tweet with verified human proof.
`);
  });

  it("keeps the compose flow on X login, World ID signing, and X posting", () => {
    const composeFlow = readProjectFile("src/components/compose-flow.tsx");

    expect(composeFlow).toContain('signIn("twitter")');
    expect(composeFlow).toContain("Login with X");
    expect(composeFlow).toContain("IDKitRequestWidget");
    expect(composeFlow).toContain("handleWidgetOpenChange");
    expect(composeFlow).toContain("proofResult.proof.xUsername === username");
    expect(composeFlow).toContain("proofResult && canShowLastProof");
    expect(composeFlow).toContain("/api/world/rp-signature");
    expect(composeFlow).toContain("/api/proofs");
    expect(composeFlow).toContain("window.location.assign(payload.tweetIntentUrl)");
    expect(composeFlow).not.toContain("xPostUrl");
    expect(composeFlow).not.toContain("editToken");
  });

  it("requires X login before creating a proof", () => {
    const proofRoute = readProjectFile("src/app/api/proofs/route.ts");

    expect(proofRoute).toContain("getServerSession(authOptions)");
    expect(proofRoute).toContain("x_login_required");
    expect(proofRoute).toContain("xUsername: session.user.username");
  });
});
