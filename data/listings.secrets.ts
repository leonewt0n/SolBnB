/**
 * Gated credentials — SERVER ONLY.
 * Never import this module from islands/ or other client bundles.
 */

export type ListingSecrets = {
  doorCode: string;
  wifiPassword: string;
};

function doorCode(seed: number): string {
  return String(100000 + ((seed * 7919) % 900000));
}

function wifiPassword(id: string, seed: number): string {
  const suffix = (seed * 9973).toString(36).slice(0, 4);
  return `SolBnB-${id}-${suffix}`;
}

/** Secrets keyed by public listing id. */
export const SECRETS: Record<string, ListingSecrets> = Object.fromEntries(
  Array.from({ length: 20 }, (_, i) => {
    const id = `sf-${String(i + 1).padStart(2, "0")}`;
    const seed = i + 1;
    return [
      id,
      {
        doorCode: doorCode(seed),
        wifiPassword: wifiPassword(id, seed),
      },
    ];
  }),
);

export function getSecrets(listingId: string): ListingSecrets | null {
  return SECRETS[listingId] ?? null;
}
