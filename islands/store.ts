import { computed, signal } from "@preact/signals";
import type { PublicListing } from "../data/listings.public.ts";
import {
  buildListingsAround,
  filterListings,
  PUBLIC_LISTINGS,
} from "../data/listings.public.ts";
import { SF_CENTER } from "../lib/constants.ts";

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

export const query = signal("");
export const listings = signal<PublicListing[]>([]);
export const selected = signal<PublicListing | null>(null);
export const checkIn = signal("");
export const checkOut = signal("");
export const unlock = signal<AccessCredentials | null>(null);
export const txStatus = signal<TxStatus>("idle");
export const txError = signal<string | null>(null);
export const lastSignature = signal<string | null>(null);
export const walletAddress = signal<string | null>(null);

export const placeLabel = signal("San Francisco");
export const mapTarget = signal<MapTarget | null>(null);
export const searchStatus = signal<"idle" | "searching" | "error">("idle");
export const searchError = signal<string | null>(null);
/** When true, list is filtered by query text; after a place search we show all local pins. */
export const localFilterOnly = signal(true);

export const filteredListings = computed(() => {
  if (!localFilterOnly.value) return listings.value;
  return filterListings(listings.value, query.value);
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

export async function searchUsaPlace(rawQuery: string): Promise<void> {
  const q = rawQuery.trim();
  searchError.value = null;

  if (q.length < 2) {
    // Reset to default SF catalog.
    listings.value = PUBLIC_LISTINGS;
    placeLabel.value = "San Francisco";
    localFilterOnly.value = true;
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

    listings.value = buildListingsAround({
      lat: body.lat,
      lng: body.lng,
      label: body.label,
      neighborhood: body.neighborhood,
      areaCode: body.areaCode,
    });
    const shortName = body.neighborhood || body.label.split(",")[0];
    placeLabel.value = shortName;
    query.value = shortName;
    // Show every pin for this place; typing afterward filters locally.
    localFilterOnly.value = false;
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
