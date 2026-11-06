import type { Connection } from "@solana/web3.js";
import { getMerchantWallet, PRICE_LAMPORTS } from "./solana.ts";

/**
 * Confirm a Devnet transfer credited the merchant at least PRICE_LAMPORTS.
 * Uses maxSupportedTransactionVersion: 1 so versioned txs are readable.
 */
export async function verifyBookingPayment(
  connection: Connection,
  signature: string,
): Promise<boolean> {
  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 1,
  });

  if (!tx || tx.meta?.err) return false;

  const merchant = getMerchantWallet();
  const accountKeys = tx.transaction.message.getAccountKeys()
    .staticAccountKeys
    .map((k) => k.toBase58());

  const merchantIdx = accountKeys.indexOf(merchant);
  if (merchantIdx < 0 || !tx.meta) return false;

  const delta =
    (tx.meta.postBalances[merchantIdx] ?? 0) -
    (tx.meta.preBalances[merchantIdx] ?? 0);

  return delta >= PRICE_LAMPORTS;
}
