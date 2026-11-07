/** Shared public constants safe for islands + server. */

/**
 * Default / minimum booking price (0.001 SOL).
 * Hosts set their own price on-chain; payments go to the listing host.
 */
export const PRICE_LAMPORTS = 1_000_000;
export const MIN_PRICE_LAMPORTS = PRICE_LAMPORTS;
export const PRICE_SOL_LABEL = "0.001 SOL";

export function lamportsToSolLabel(lamports: number): string {
  const sol = lamports / 1_000_000_000;
  const text = Number.isInteger(sol)
    ? String(sol)
    : sol.toFixed(6).replace(/\.?0+$/, "");
  return `${text} SOL`;
}

export function solToLamports(sol: number): number {
  return Math.round(sol * 1_000_000_000);
}

export const SF_CENTER = { lat: 37.7749, lng: -122.4194 } as const;
export const DEVNET_RPC_DEFAULT = "https://api.devnet.solana.com";

/** Fallback merchant pubkey for local demo (Devnet receive-only). Override with MERCHANT_WALLET. */
export const DEFAULT_MERCHANT_WALLET =
  "8sLLMSxZEJEaAH381YqeBdXzqjxKfSxU36xGaW7b81x5";

/** Deployed SolBnB listing program on Devnet. Override with LISTING_PROGRAM_ID. */
export const DEFAULT_LISTING_PROGRAM_ID =
  "FkYg3CaWUoN3Af6BU486X2rLpg4b3ra8gKBPiztd2WJd";
