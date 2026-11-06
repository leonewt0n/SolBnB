/** Shared public constants safe for islands + server. */

export const PRICE_LAMPORTS = 1_000; // 0.000001 SOL
export const PRICE_SOL_LABEL = "0.000001 SOL";

export const SF_CENTER = { lat: 37.7749, lng: -122.4194 } as const;
export const DEVNET_RPC_DEFAULT = "https://api.devnet.solana.com";

/** Fallback merchant pubkey for local demo (Devnet receive-only). Override with MERCHANT_WALLET. */
export const DEFAULT_MERCHANT_WALLET =
  "8sLLMSxZEJEaAH381YqeBdXzqjxKfSxU36xGaW7b81x5";
