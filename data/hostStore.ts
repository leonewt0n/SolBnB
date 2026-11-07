/**
 * Durable host listings + secrets (SERVER ONLY).
 * Survives refresh / wallet disconnect / Deno reload.
 */
import type { PublicListing } from "./listings.public.ts";
import type { ListingSecrets } from "./listings.secrets.ts";

export type HostRecord = {
  listing: PublicListing;
  secrets: ListingSecrets;
  salt?: string;
  commitmentHex?: string;
  signature?: string | null;
};

type StoreFile = {
  records: HostRecord[];
};

const STORE_PATH = new URL("./.host-store.json", import.meta.url);

let cache: StoreFile | null = null;

async function readStore(): Promise<StoreFile> {
  if (cache) return cache;
  try {
    const raw = await Deno.readTextFile(STORE_PATH);
    const parsed = JSON.parse(raw) as StoreFile;
    cache = { records: Array.isArray(parsed.records) ? parsed.records : [] };
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      console.error("hostStore read failed", err);
    }
    cache = { records: [] };
  }
  return cache;
}

async function writeStore(store: StoreFile): Promise<void> {
  cache = store;
  await Deno.writeTextFile(STORE_PATH, JSON.stringify(store, null, 2));
}

export async function getHostListings(): Promise<PublicListing[]> {
  const store = await readStore();
  return store.records.map((r) => r.listing);
}

export async function getHostSecrets(
  listingId: string,
): Promise<ListingSecrets | null> {
  const store = await readStore();
  return store.records.find((r) => r.listing.id === listingId)?.secrets ?? null;
}

export async function upsertHostRecord(record: HostRecord): Promise<void> {
  const store = await readStore();
  const idx = store.records.findIndex((r) =>
    r.listing.id === record.listing.id
  );
  if (idx >= 0) store.records[idx] = record;
  else store.records.unshift(record);
  await writeStore(store);
}
