/**
 * Read Listing PDAs owned by the SolBnB program (public GPS pins).
 */
import { Connection, PublicKey } from "@solana/web3.js";
import type { PublicListing } from "../data/listings.public.ts";
import { DEFAULT_LISTING_PROGRAM_ID, PRICE_LAMPORTS } from "./constants.ts";
import { getConnection } from "./solana.ts";

export { DEFAULT_LISTING_PROGRAM_ID };

export function getListingProgramId(): string {
  return Deno.env.get("LISTING_PROGRAM_ID")?.trim() ||
    DEFAULT_LISTING_PROGRAM_ID;
}

async function listingAccountDiscriminator(): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode("account:Listing"),
  );
  return new Uint8Array(hash).slice(0, 8);
}

function discMatches(data: Uint8Array, disc: Uint8Array): boolean {
  if (data.length < 8) return false;
  for (let i = 0; i < 8; i++) {
    if (data[i] !== disc[i]) return false;
  }
  return true;
}

function decodeListingAccount(
  pubkey: string,
  raw: Uint8Array,
): PublicListing | null {
  try {
    const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    let o = 8; // skip discriminator
    const hostPubkey = new PublicKey(raw.subarray(o, o + 32)).toBase58();
    o += 32;

    const nameLen = view.getUint32(o, true);
    o += 4;
    if (nameLen > 64 || o + nameLen > raw.length) return null;
    const name = new TextDecoder().decode(raw.subarray(o, o + nameLen));
    o += nameLen;

    const lat = view.getFloat64(o, true);
    o += 8;
    const lng = view.getFloat64(o, true);
    o += 8;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return {
      id: pubkey,
      name: name || "On-chain stay",
      neighborhood: "On-chain",
      areaCode: "00000",
      lat,
      lng,
      priceLamports: PRICE_LAMPORTS,
      beds: 1,
      hostPubkey,
    };
  } catch {
    return null;
  }
}

/** Fetch every Listing account for the program from Devnet. */
export async function fetchOnChainListings(
  connection: Connection = getConnection(),
  programId = getListingProgramId(),
): Promise<PublicListing[]> {
  if (!programId) return [];

  const disc = await listingAccountDiscriminator();
  const owner = new PublicKey(programId);
  const accounts = await connection.getProgramAccounts(owner, {
    commitment: "confirmed",
  });

  const out: PublicListing[] = [];
  for (const { pubkey, account } of accounts) {
    const data = account.data instanceof Uint8Array
      ? account.data
      : new Uint8Array(account.data);
    if (!discMatches(data, disc)) continue;
    const listing = decodeListingAccount(pubkey.toBase58(), data);
    if (listing) out.push(listing);
  }
  return out;
}
