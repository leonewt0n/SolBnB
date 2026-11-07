import type { Connection } from "@solana/web3.js";
import { splitBookingPayment } from "./constants.ts";

function balanceDelta(
  accountKeys: string[],
  pre: number[],
  post: number[],
  pubkey: string,
): number | null {
  const idx = accountKeys.indexOf(pubkey);
  if (idx < 0) return null;
  return (post[idx] ?? 0) - (pre[idx] ?? 0);
}

/**
 * Confirm a Devnet booking tx paid the host ~90% and the merchant ~10%.
 * Uses maxSupportedTransactionVersion: 1 so versioned txs are readable.
 */
export async function verifyBookingPayment(
  connection: Connection,
  signature: string,
  hostPubkey: string,
  merchantPubkey: string,
  priceLamports: number,
): Promise<boolean> {
  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 1,
  });

  if (!tx || tx.meta?.err) return false;
  if (
    !hostPubkey ||
    !merchantPubkey ||
    !Number.isFinite(priceLamports) ||
    priceLamports <= 0
  ) {
    return false;
  }

  const accountKeys = tx.transaction.message.getAccountKeys()
    .staticAccountKeys
    .map((k) => k.toBase58());
  const pre = tx.meta.preBalances;
  const post = tx.meta.postBalances;

  const { hostLamports, platformLamports } = splitBookingPayment(
    priceLamports,
  );

  // Same wallet for host + merchant: one credit of the full price is enough.
  if (hostPubkey === merchantPubkey) {
    const delta = balanceDelta(accountKeys, pre, post, hostPubkey);
    return delta != null && delta >= Math.floor(priceLamports);
  }

  const hostDelta = balanceDelta(accountKeys, pre, post, hostPubkey);
  const merchantDelta = balanceDelta(accountKeys, pre, post, merchantPubkey);
  if (hostDelta == null || merchantDelta == null) return false;

  return hostDelta >= hostLamports && merchantDelta >= platformLamports;
}
