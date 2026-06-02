import { bytesToHex } from "@noble/hashes/utils.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { createPublicClient, http, isAddress } from "viem";
import { worldchain } from "viem/chains";

import type { WorldServerConfig } from "@/lib/config";
import { ApiError } from "@/lib/http";

const WORLD_CHAIN_RPC_URL = "https://worldchain-mainnet.g.alchemy.com/public";
const WORLD_ID_ADDRESS_BOOK_CONTRACT = "0x57b930D551e677CC36e2fA036Ae2fe8FdaE0330D";

const encoder = new TextEncoder();

const addressVerifiedUntilAbi = [
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "addressVerifiedUntil",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export type WorldAppAccountPayload = {
  wallet_address: string;
  world_app_version?: number;
  device_os?: string;
  verification_status?: {
    is_orb_verified?: boolean;
    is_document_verified?: boolean;
    is_secure_document_verified?: boolean;
  };
};

export type WorldAccountVerification = {
  address: `0x${string}`;
  nullifierDecimal: string;
  verifiedAt: string;
  resultCode: string;
};

type VerifyWorldAppAccountOptions = {
  isAddressVerified?: (address: `0x${string}`) => Promise<boolean>;
};

export async function verifyWorldAppAccount(
  config: WorldServerConfig,
  payload: WorldAppAccountPayload,
  options: VerifyWorldAppAccountOptions = {},
): Promise<WorldAccountVerification> {
  const address = normalizeAddress(payload.wallet_address);
  const isAddressVerified = options.isAddressVerified ?? isWorldIdAddressVerified;

  if (!(await isAddressVerified(address))) {
    throw new ApiError(403, "world_address_unverified", "This World App account is not World ID verified.");
  }

  return {
    address,
    nullifierDecimal: walletAddressToNullifierDecimal(address, config.action),
    verifiedAt: new Date().toISOString(),
    resultCode: "world_app_account_address_book",
  };
}

export async function isWorldIdAddressVerified(address: `0x${string}`): Promise<boolean> {
  const client = createWorldChainClient();

  try {
    const verifiedUntil = await client.readContract({
      address: WORLD_ID_ADDRESS_BOOK_CONTRACT,
      abi: addressVerifiedUntilAbi,
      functionName: "addressVerifiedUntil",
      args: [address],
    });

    return verifiedUntil > BigInt(Math.floor(Date.now() / 1000));
  } catch (error) {
    throw new ApiError(503, "address_book_unavailable", "World ID Address Book verification is unavailable.", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export function walletAddressToNullifierDecimal(address: `0x${string}`, action: string): string {
  const digest = keccak_256(encoder.encode(`${action}:${address.toLowerCase()}`));
  return BigInt(`0x${bytesToHex(digest)}`).toString(10);
}

function normalizeAddress(value: string): `0x${string}` {
  if (!isAddress(value)) {
    throw new ApiError(400, "invalid_world_account", "World App returned an invalid account.");
  }

  return value as `0x${string}`;
}

function createWorldChainClient() {
  return createPublicClient({
    chain: worldchain,
    transport: http(process.env.WORLD_CHAIN_RPC_URL || WORLD_CHAIN_RPC_URL),
  });
}
