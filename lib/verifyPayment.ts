import type { Connection } from "@solana/web3.js";

/**
 * Confirm a Devnet transfer credited `payee` at least `minLamports`.
 * Uses maxSupportedTransactionVersion: 1 so versioned txs are readable.
 */
export async function verifyBookingPayment(
  connection: Connection,
  signature: string,
  payee: string,
  minLamports: number,
): Promise<boolean> {
  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 1,
  });

  if (!tx || tx.meta?.err) return false;
  if (!payee || !Number.isFinite(minLamports) || minLamports <= 0) {
    return false;
  }

  const accountKeys = tx.transaction.message.getAccountKeys()
    .staticAccountKeys
    .map((k) => k.toBase58());

  const payeeIdx = accountKeys.indexOf(payee);
  if (payeeIdx < 0 || !tx.meta) return false;

  const delta =
    (tx.meta.postBalances[payeeIdx] ?? 0) -
    (tx.meta.preBalances[payeeIdx] ?? 0);

  return delta >= minLamports;
}
