/**
 * Builds + sends `initialize_listing` against the SolBnB Anchor program.
 * GPS is public on-chain. secretsCommitment = sha256(door||wifi||salt);
 * plaintext never lands on-chain (see /api/host-secrets).
 */
import { DEVNET_RPC_DEFAULT } from "../lib/constants.ts";
import { getWalletProvider, loadWeb3 } from "./pay.ts";

export type CreateListingInput = {
  programId: string;
  name: string;
  lat: number;
  lng: number;
  /** Unique per listing; also PDA seed. */
  nonce: bigint;
  /** 32-byte sha256(door + wifi + salt). */
  secretsCommitment: Uint8Array;
};

export type CreateListingResult = {
  signature: string;
  listingPda: string;
};

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(data);
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return new Uint8Array(digest);
}

async function initializeListingDiscriminator(): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const hash = await sha256(enc.encode("global:initialize_listing"));
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

export async function commitSecrets(
  doorCode: string,
  wifiPassword: string,
  salt: string,
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  return sha256(enc.encode(`${doorCode}\0${wifiPassword}\0${salt}`));
}

export async function createListingOnChain(
  input: CreateListingInput,
): Promise<CreateListingResult> {
  const provider = getWalletProvider();
  if (!provider?.publicKey) {
    throw new Error("Connect your wallet first.");
  }
  if (!input.programId) {
    throw new Error("Listing program is not configured (LISTING_PROGRAM_ID).");
  }
  if (input.secretsCommitment.length !== 32) {
    throw new Error("secretsCommitment must be 32 bytes.");
  }

  const {
    Connection,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
  } = await loadWeb3();

  const programId = new PublicKey(input.programId);
  const host = new PublicKey(provider.publicKey.toString());
  const nonceBytes = encodeU64(input.nonce);

  const [listingPda] = PublicKey.findProgramAddressSync(
    [
      new TextEncoder().encode("listing"),
      host.toBuffer(),
      nonceBytes,
    ],
    programId,
  );

  // Args order must match Anchor: name, lat, lng, secrets_commitment, nonce
  const data = concatBytes(
    await initializeListingDiscriminator(),
    encodeString(input.name.slice(0, 64)),
    encodeF64(input.lat),
    encodeF64(input.lng),
    input.secretsCommitment,
    nonceBytes,
  );

  const ix = new TransactionInstruction({
    keys: [
      { pubkey: listingPda, isSigner: false, isWritable: true },
      { pubkey: host, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
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
    throw new Error("Create-listing transaction failed on-chain.");
  }

  return { signature, listingPda: listingPda.toString() };
}
