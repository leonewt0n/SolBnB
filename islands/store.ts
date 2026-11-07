import { computed, signal } from "@preact/signals";
import type { PublicListing } from "../data/listings.public.ts";
import { filterListings } from "../data/listings.public.ts";
import { PRICE_LAMPORTS, SF_CENTER } from "../lib/constants.ts";

export type TxStatus = "idle" | "signing" | "confirming" | "done" | "error";

export type AccessCredentials = {
  doorCode: string;
  wifiPassword: string;
};

export type MapTarget = {
  lat: number;
  lng: number;
  zoom: number;
  label: string;
};

/** Wallet-created pins only (on-chain + local mirror). No mock catalog. */
export const hostListings = signal<PublicListing[]>([]);
export const selected = signal<PublicListing | null>(null);
export const query = signal("");

const HOST_STORAGE_KEY = "solbnb-host-listings";
const WALLET_STORAGE_KEY = "solbnb-wallet";
const BOOKING_STORAGE_KEY = "solbnb-bookings";
let hostsHydrated = false;

export type BookingRecord = {
  id: string;
  listingId: string;
  name: string;
  neighborhood: string;
  beds: number;
  checkIn: string;
  checkOut: string;
  signature: string;
  renterPubkey: string;
};

function readHostStorage(): PublicListing[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(HOST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as PublicListing[] : [];
  } catch {
    return [];
  }
}

function writeHostStorage(items: PublicListing[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(HOST_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota / private mode — server / chain still source of truth.
  }
}

function mergeListing(
  prev: PublicListing | undefined,
  next: PublicListing,
): PublicListing {
  if (!prev) return next;
  return {
    ...prev,
    ...next,
    hostPubkey: next.hostPubkey ?? prev.hostPubkey,
  };
}

export function hydrateHostListings(fromServer: PublicListing[]) {
  if (hostsHydrated) return;
  hostsHydrated = true;
  const local = readHostStorage();
  const byId = new Map<string, PublicListing>();
  for (const l of local) byId.set(l.id, l);
  for (const l of fromServer) {
    byId.set(l.id, mergeListing(byId.get(l.id), l));
  }
  hostListings.value = [...byId.values()];
  writeHostStorage(hostListings.value);
}

/** Merge pins from chain/API without wiping local-only drafts. */
export function mergeHostListings(incoming: PublicListing[]) {
  if (incoming.length === 0) return;
  const byId = new Map(hostListings.value.map((l) => [l.id, l]));
  for (const l of incoming) {
    byId.set(l.id, mergeListing(byId.get(l.id), l));
  }
  const next = [...byId.values()];
  hostListings.value = next;
  writeHostStorage(next);
}

export const checkIn = signal("");
export const checkOut = signal("");
export const unlock = signal<AccessCredentials | null>(null);
export const txStatus = signal<TxStatus>("idle");
export const txError = signal<string | null>(null);
export const lastSignature = signal<string | null>(null);
export const walletAddress = signal<string | null>(null);
export const walletMenuOpen = signal(false);
export const accountOpen = signal(false);
export const listingOpen = signal(false);

function readWalletStorage(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(WALLET_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeWalletStorage(addr: string | null) {
  if (typeof localStorage === "undefined") return;
  try {
    if (addr) localStorage.setItem(WALLET_STORAGE_KEY, addr);
    else localStorage.removeItem(WALLET_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Optimistic restore so UI stays connected across Fresh page loads. */
export function hydrateWalletAddress() {
  if (walletAddress.value) return;
  const stored = readWalletStorage();
  if (stored) walletAddress.value = stored;
}

export function setWalletAddress(addr: string | null) {
  walletAddress.value = addr;
  writeWalletStorage(addr);
}

function readBookingStorage(): BookingRecord[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(BOOKING_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as BookingRecord[] : [];
  } catch {
    return [];
  }
}

function writeBookingStorage(items: BookingRecord[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function addBooking(input: Omit<BookingRecord, "id">): BookingRecord {
  const record: BookingRecord = {
    ...input,
    id: `${input.listingId}-${input.signature.slice(0, 12)}`,
  };
  const next = [
    record,
    ...readBookingStorage().filter((b) => b.id !== record.id),
  ];
  writeBookingStorage(next);
  return record;
}

export function bookingsForWallet(renterPubkey: string): BookingRecord[] {
  return readBookingStorage().filter((b) => b.renterPubkey === renterPubkey);
}

export function listingsForHost(hostPubkey: string): PublicListing[] {
  return hostListings.value.filter((l) => l.hostPubkey === hostPubkey);
}

export const creationMode = signal(false);
export const pendingPin = signal<{ lat: number; lng: number } | null>(null);

export const placeLabel = signal("San Francisco");
export const mapTarget = signal<MapTarget | null>(null);
export const searchStatus = signal<"idle" | "searching" | "error">("idle");
export const searchError = signal<string | null>(null);

/** Map shows only wallet-created host pins (optionally filtered by search text). */
export const filteredListings = computed(() => {
  return filterListings(hostListings.value, query.value);
});

export function resetBookingUi() {
  unlock.value = null;
  txStatus.value = "idle";
  txError.value = null;
  lastSignature.value = null;
}

export function selectListing(listing: PublicListing | null) {
  selected.value = listing;
  resetBookingUi();
}

export function openAccount() {
  walletMenuOpen.value = false;
  accountOpen.value = true;
}

export function openListingModal() {
  listingOpen.value = true;
}

export function startCreateListing() {
  creationMode.value = true;
  pendingPin.value = null;
  listingOpen.value = false;
  selectListing(null);
}

export function setCreatePin(lat: number, lng: number) {
  pendingPin.value = { lat, lng };
  listingOpen.value = true;
}

export function cancelCreateListing() {
  creationMode.value = false;
  pendingPin.value = null;
  listingOpen.value = false;
}

export function logoutWallet() {
  setWalletAddress(null);
  walletMenuOpen.value = false;
  accountOpen.value = false;
}

export function addHostListing(input: {
  name: string;
  neighborhood: string;
  areaCode: string;
  description?: string;
  beds: number;
  lat: number;
  lng: number;
  id?: string;
  hostPubkey?: string;
}): PublicListing {
  const slug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20) || "stay";
  const description = input.description?.trim().slice(0, 500);
  const listing: PublicListing = {
    id: input.id ?? `host-${slug}-${Date.now().toString(36)}`,
    name: input.name.trim(),
    neighborhood: input.neighborhood.trim() || placeLabel.value,
    areaCode: input.areaCode.trim() || "00000",
    ...(description ? { description } : {}),
    lat: input.lat,
    lng: input.lng,
    priceLamports: PRICE_LAMPORTS,
    beds: Math.max(1, Math.min(8, input.beds || 1)),
    hostPubkey: input.hostPubkey,
  };
  const next = [
    listing,
    ...hostListings.value.filter((l) => l.id !== listing.id),
  ];
  hostListings.value = next;
  writeHostStorage(next);
  return listing;
}

/** Drop a host listing from local mirror (after on-chain close). */
export function removeHostListing(listingId: string): void {
  const next = hostListings.value.filter((l) => l.id !== listingId);
  hostListings.value = next;
  writeHostStorage(next);
  if (selected.value?.id === listingId) {
    selectListing(null);
  }
}

/** Fly map to a USA place — does not invent mock pins. */
export async function searchUsaPlace(rawQuery: string): Promise<void> {
  const q = rawQuery.trim();
  searchError.value = null;

  if (q.length < 2) {
    placeLabel.value = "San Francisco";
    mapTarget.value = {
      lat: SF_CENTER.lat,
      lng: SF_CENTER.lng,
      zoom: 13,
      label: "San Francisco",
    };
    selectListing(null);
    searchStatus.value = "idle";
    return;
  }

  searchStatus.value = "searching";
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error ?? `Search failed (${res.status})`);
    }

    const shortName = body.neighborhood || body.label.split(",")[0];
    placeLabel.value = shortName;
    query.value = "";
    mapTarget.value = {
      lat: body.lat,
      lng: body.lng,
      zoom: 12,
      label: body.label,
    };
    selectListing(null);
    searchStatus.value = "idle";
  } catch (err) {
    searchStatus.value = "error";
    searchError.value = err instanceof Error ? err.message : "Search failed";
  }
}
