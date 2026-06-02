import { describe, expect, it } from "vitest";

import type { WorldServerConfig } from "@/lib/config";
import {
  verifyWorldAppAccount,
  walletAddressToNullifierDecimal,
} from "@/lib/world-account";

const config = {
  appId: "app_123",
  rpId: "rp_123",
  rpSigningKey: "1".repeat(64),
  action: "veripost-tweet-proof",
  environment: "production",
  appUrl: "https://veripost.io",
  supportEmail: "support@veripost.io",
} satisfies WorldServerConfig;

const address = "0x1111111111111111111111111111111111111111" as const;

describe("World App account verification", () => {
  it("accepts a World App account when the wallet is address-book verified", async () => {
    const result = await verifyWorldAppAccount(
      config,
      {
        wallet_address: address,
        world_app_version: 4001000,
        device_os: "ios",
        verification_status: {
          is_orb_verified: true,
          is_document_verified: false,
          is_secure_document_verified: false,
        },
      },
      {
        isAddressVerified: async () => true,
      },
    );

    expect(result.address).toBe(address);
    expect(result.resultCode).toBe("world_app_account_address_book");
    expect(result.nullifierDecimal).toBe(walletAddressToNullifierDecimal(address, config.action));
  });

  it("rejects accounts that are not verified in the World ID Address Book", async () => {
    await expect(
      verifyWorldAppAccount(
        config,
        {
          wallet_address: address,
          verification_status: {
            is_orb_verified: true,
          },
        },
        {
          isAddressVerified: async () => false,
        },
      ),
    ).rejects.toThrow("not World ID verified");
  });

  it("rejects malformed account addresses", async () => {
    await expect(
      verifyWorldAppAccount(
        config,
        {
          wallet_address: "not-an-address",
        },
        {
          isAddressVerified: async () => true,
        },
      ),
    ).rejects.toThrow("invalid account");
  });

  it("uses a private deterministic account nullifier instead of storing the wallet address", () => {
    const nullifier = walletAddressToNullifierDecimal(address, config.action);

    expect(nullifier).toMatch(/^[0-9]+$/);
    expect(nullifier).not.toContain(address.slice(2).toLowerCase());
    expect(walletAddressToNullifierDecimal(address, config.action)).toBe(nullifier);
  });
});
