/**
 * Builds + sends `update_price` against the SolBnB Anchor program.
 */
import { DEVNET_RPC_DEFAULT, MIN_PRICE_LAMPORTS } from "../lib/constants.ts";
import { getWalletProvider, loadWeb3 } from "./pay.ts";

export type UpdatePriceInput = {
  programId: string;
  listingPda: string;
  priceLamports: number;
};

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(data);
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return new Uint8Array(digest);
}

async function updatePriceDiscriminator(): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const hash = await sha256(enc.encode("global:update_price"));
  return hash.slice(0, 8);
}

function encodeU64(n: bigint): Uint8Array {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, n, true);
  return out;
}

export async function updateListingPriceOnChain(
  input: UpdatePriceInput,
): Promise<{ signature: string }> {
  const provider = getWalletProvider();
  if (!provider?.publicKey) {
    throw new Error("Connect your wallet first.");
  }
  if (!input.programId) {
    throw new Error("Listing program is not configured (LISTING_PROGRAM_ID).");
  }
  if (
    !Number.isFinite(input.priceLamports) ||
    input.priceLamports < MIN_PRICE_LAMPORTS
  ) {
    throw new Error("Price must be at least 0.001 SOL.");
  }

  const {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
  } = await loadWeb3();

  const programId = new PublicKey(input.programId);
  const host = new PublicKey(provider.publicKey.toString());
  const listing = new PublicKey(input.listingPda);

  const data = new Uint8Array(8 + 8);
  data.set(await updatePriceDiscriminator(), 0);
  data.set(encodeU64(BigInt(Math.floor(input.priceLamports))), 8);

  const ix = new TransactionInstruction({
    keys: [
      { pubkey: listing, isSigner: false, isWritable: true },
      { pubkey: host, isSigner: true, isWritable: false },
    ],
    programId,
    data,
  });

  const connection = new Connection(DEVNET_RPC_DEFAULT, "confirmed");
  const { blockhash, lastValidBlockHeight } = await connection
    .getLatestBlockhash("confirmed");

  const tx = new Transaction({
    feePayer: host,
    blockhash,
    lastValidBlockHeight,
  }).add(ix);

  const { signature } = await provider.signAndSendTransaction(tx);
  const confirmation = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  if (confirmation.value.err) {
    throw new Error("Update-price transaction failed on-chain.");
  }

  return { signature };
}
