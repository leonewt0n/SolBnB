/**
 * Builds + sends `close_listing` against the SolBnB Anchor program.
 * Only the host signer can close; rent returns to the host.
 */
import { DEVNET_RPC_DEFAULT } from "../lib/constants.ts";
import { getWalletProvider, loadWeb3 } from "./pay.ts";

export type DeleteListingInput = {
  programId: string;
  listingPda: string;
};

export type DeleteListingResult = {
  signature: string;
};

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(data);
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return new Uint8Array(digest);
}

async function closeListingDiscriminator(): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const hash = await sha256(enc.encode("global:close_listing"));
  return hash.slice(0, 8);
}

export async function closeListingOnChain(
  input: DeleteListingInput,
): Promise<DeleteListingResult> {
  const provider = getWalletProvider();
  if (!provider?.publicKey) {
    throw new Error("Connect your wallet first.");
  }
  if (!input.programId) {
    throw new Error("Listing program is not configured (LISTING_PROGRAM_ID).");
  }
  if (!input.listingPda) {
    throw new Error("Listing address is required.");
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

  const ix = new TransactionInstruction({
    keys: [
      { pubkey: listing, isSigner: false, isWritable: true },
      { pubkey: host, isSigner: true, isWritable: true },
    ],
    programId,
    data: await closeListingDiscriminator(),
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
    throw new Error("Close-listing transaction failed on-chain.");
  }

  return { signature };
}
