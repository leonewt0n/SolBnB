/**
 * Gated credentials — SERVER ONLY.
 * Never import this module from islands/ or other client bundles.
 *
 * Door / Wi-Fi are stored exactly as the host typed them (after trim).
 */

import { getHostSecrets } from "./hostStore.ts";

export type ListingSecrets = {
  doorCode: string;
  wifiPassword: string;
};

/** Resolve host-stored secrets only — never invent or rewrite passwords. */
export async function getSecrets(
  listingId: string,
): Promise<ListingSecrets | null> {
  if (!listingId.trim()) return null;
  return await getHostSecrets(listingId);
}
