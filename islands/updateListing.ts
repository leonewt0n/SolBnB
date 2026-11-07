/**
 * Builds + sends `update_listing` against the SolBnB Anchor program.
 */
import { DEVNET_RPC_DEFAULT, MIN_PRICE_LAMPORTS } from "../lib/constants.ts";
import { getWalletProvider, loadWeb3 } from "./pay.ts";

export type UpdateListingInput = {
  programId: string;
  listingPda: string;
  name: string;
  lat: number;
  lng: number;
  secretsCommitment: Uint8Array;
  priceLamports: number;
};

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(data);
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return new Uint8Array(digest);
}

async function updateListingDiscriminator(): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const hash = await sha256(enc.encode("global:update_listing"));
  return hash.slice(0, 8);
}

function encodeString(value: string): Uint8Array {
  const body = new TextEncoder().encode(value);
  const out = new Uint8Array(4 + body.length);
  new DataView(out.buffer).setUint32(0, body.length, true);
  out.set(body, 4);
  return out;
}

function encodeF64(n: number): Uint8Array {
  const buf = new ArrayBuffer(8);
  new DataView(buf).setFloat64(0, n, true);
  return new Uint8Array(buf);
}

function encodeU64(n: bigint): Uint8Array {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, n, true);
  return out;
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

export async function updateListingOnChain(
  input: UpdateListingInput,
): Promise<{ signature: string }> {
  const provider = getWalletProvider();
  if (!provider?.publicKey) {
    throw new Error("Connect your wallet first.");
  }
  if (!input.programId) {
    throw new Error("Listing program is not configured (LISTING_PROGRAM_ID).");
  }
  if (!input.name.trim() || input.name.trim().length > 64) {
    throw new Error("Name must be 1–64 characters.");
  }
  if (
    !Number.isFinite(input.priceLamports) ||
    input.priceLamports < MIN_PRICE_LAMPORTS
  ) {
    throw new Error("Price must be at least 0.001 SOL.");
  }
  if (input.secretsCommitment.length !== 32) {
    throw new Error("secretsCommitment must be 32 bytes.");
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

  const data = concatBytes(
    await updateListingDiscriminator(),
    encodeString(input.name.trim().slice(0, 64)),
    encodeF64(input.lat),
    encodeF64(input.lng),
    input.secretsCommitment,
    encodeU64(BigInt(Math.floor(input.priceLamports))),
  );

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
    throw new Error("Update-listing transaction failed on-chain.");
  }

  return { signature };
}
