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
  /** Listing PDAs removed by the host; hide even if still on-chain. */
  deletedIds: string[];
};

const STORE_PATH = new URL("./.host-store.json", import.meta.url);

let cache: StoreFile | null = null;

function normalizeStore(parsed: Partial<StoreFile> | null): StoreFile {
  return {
    records: Array.isArray(parsed?.records) ? parsed!.records : [],
    deletedIds: Array.isArray(parsed?.deletedIds) ? parsed!.deletedIds : [],
  };
}

async function readStore(): Promise<StoreFile> {
  if (cache) return cache;
  try {
    const raw = await Deno.readTextFile(STORE_PATH);
    cache = normalizeStore(JSON.parse(raw) as Partial<StoreFile>);
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      console.error("hostStore read failed", err);
    }
    cache = normalizeStore(null);
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

/** Remove a host listing + secrets. Returns the removed record if any. */
export async function deleteHostRecord(
  listingId: string,
): Promise<HostRecord | null> {
  const store = await readStore();
  const idx = store.records.findIndex((r) => r.listing.id === listingId);
  let removed: HostRecord | null = null;
  if (idx >= 0) {
    [removed] = store.records.splice(idx, 1);
  }
  if (!store.deletedIds.includes(listingId)) {
    store.deletedIds.unshift(listingId);
  }
  await writeStore(store);
  return removed;
}

export async function getHostRecord(
  listingId: string,
): Promise<HostRecord | null> {
  const store = await readStore();
  return store.records.find((r) => r.listing.id === listingId) ?? null;
}

export async function getDeletedListingIds(): Promise<string[]> {
  const store = await readStore();
  return [...store.deletedIds];
}
