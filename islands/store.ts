import { computed, signal } from "@preact/signals";
import type { PublicListing } from "../data/listings.public.ts";
import { filterListings } from "../data/listings.public.ts";

export type TxStatus = "idle" | "signing" | "confirming" | "done" | "error";

export type AccessCredentials = {
  doorCode: string;
  wifiPassword: string;
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

export const filteredListings = computed(() =>
  filterListings(listings.value, query.value)
);

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
