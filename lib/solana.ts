import { Connection, PublicKey } from "@solana/web3.js";
import {
  DEFAULT_MERCHANT_WALLET,
  DEVNET_RPC_DEFAULT,
  PRICE_LAMPORTS,
} from "./constants.ts";

export { PRICE_LAMPORTS };

export function getRpcUrl(): string {
  return Deno.env.get("RPC_URL") ?? DEVNET_RPC_DEFAULT;
}

export function getMerchantWallet(): string {
  return Deno.env.get("MERCHANT_WALLET") ?? DEFAULT_MERCHANT_WALLET;
}

export function getMerchantPubkey(): PublicKey {
  return new PublicKey(getMerchantWallet());
}

export function getConnection(): Connection {
  return new Connection(getRpcUrl(), "confirmed");
}
