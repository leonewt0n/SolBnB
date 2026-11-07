/** Shared public constants safe for islands + server. */

/**
 * 0.001 SOL — tiny for a demo, but above Solana's rent-exempt minimum
 * (~0.00089 SOL) so the first payment can create the merchant account
 * if it does not exist yet on Devnet.
 */
export const PRICE_LAMPORTS = 1_000_000;
export const PRICE_SOL_LABEL = "0.001 SOL";

export const SF_CENTER = { lat: 37.7749, lng: -122.4194 } as const;
export const DEVNET_RPC_DEFAULT = "https://api.devnet.solana.com";

/** Fallback merchant pubkey for local demo (Devnet receive-only). Override with MERCHANT_WALLET. */
export const DEFAULT_MERCHANT_WALLET =
  "8sLLMSxZEJEaAH381YqeBdXzqjxKfSxU36xGaW7b81x5";

/** Deployed SolBnB listing program on Devnet. Override with LISTING_PROGRAM_ID. */
export const DEFAULT_LISTING_PROGRAM_ID =
  "FkYg3CaWUoN3Af6BU486X2rLpg4b3ra8gKBPiztd2WJd";
