/**
 * Gated credentials — SERVER ONLY.
 * Never import this module from islands/ or other client bundles.
 */

export type ListingSecrets = {
  doorCode: string;
  wifiPassword: string;
};

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function doorCode(seed: number): string {
  return String(100000 + ((seed * 7919) % 900000));
}

function wifiPassword(id: string, seed: number): string {
  const suffix = (seed * 9973).toString(36).slice(0, 4);
  return `SolBnB-${id}-${suffix}`;
}

function secretsFor(id: string, seed: number): ListingSecrets {
  return {
    doorCode: doorCode(seed),
    wifiPassword: wifiPassword(id, seed),
  };
}

/** Legacy SF seed map (stable for the default homepage pins). */
export const SECRETS: Record<string, ListingSecrets> = Object.fromEntries(
  Array.from({ length: 20 }, (_, i) => {
    const id = `sf-${String(i + 1).padStart(2, "0")}`;
    return [id, secretsFor(id, i + 1)];
  }),
);

/** Resolve secrets for SF defaults or any USA-generated listing id. */
export function getSecrets(listingId: string): ListingSecrets | null {
  if (!listingId.trim()) return null;
  if (SECRETS[listingId]) return SECRETS[listingId];
  return secretsFor(listingId, hashSeed(listingId) || 1);
}
