import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getConnection, getMerchantPubkey } from "./solana.ts";

let ensurePromise: Promise<void> | null = null;

/**
 * Make sure the Devnet merchant account exists so tiny transfers succeed.
 * Phantom often reports "insufficient SOL" when a transfer would create an
 * account with fewer lamports than rent-exempt.
 */
export function ensureMerchantFunded(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      try {
        const connection = getConnection();
        const merchant = getMerchantPubkey();
        const balance = await connection.getBalance(merchant);
        if (balance > 0) {
          console.log(
            `[solbnb] Merchant funded (${balance} lamports): ${merchant.toBase58()}`,
          );
          return;
        }

        console.log(
          `[solbnb] Merchant unfunded — requesting Devnet airdrop for ${merchant.toBase58()}`,
        );
        const sig = await connection.requestAirdrop(
          merchant,
          LAMPORTS_PER_SOL,
        );
        const { blockhash, lastValidBlockHeight } = await connection
          .getLatestBlockhash("confirmed");
        await connection.confirmTransaction(
          { signature: sig, blockhash, lastValidBlockHeight },
          "confirmed",
        );
        console.log(`[solbnb] Merchant airdrop confirmed: ${sig}`);
      } catch (err) {
        console.warn(
          "[solbnb] Could not airdrop merchant wallet. Set MERCHANT_WALLET to your own funded Devnet address, or use the faucet.",
          err,
        );
      }
    })();
  }
  return ensurePromise;
}
