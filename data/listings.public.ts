import { PRICE_LAMPORTS, SF_CENTER } from "../lib/constants.ts";

export type PublicListing = {
  id: string;
  name: string;
  areaCode: string;
  neighborhood: string;
  lat: number;
  lng: number;
  priceLamports: number;
  beds: number;
  /** Host wallet that created the listing (when known). */
  hostPubkey?: string;
};

const STYLES = [
  "Loft",
  "Victorian Flat",
  "Garden Studio",
  "Bay View Room",
  "Townhouse Suite",
  "Artist Pad",
  "Cottage",
  "Penthouse Nook",
];

const SF_NEIGHBORHOODS: Array<
  { name: string; areaCode: string; lat: number; lng: number }
> = [
  { name: "Mission", areaCode: "94110", lat: 37.7599, lng: -122.4148 },
  { name: "Soma", areaCode: "94103", lat: 37.7785, lng: -122.4056 },
  { name: "Marina", areaCode: "94123", lat: 37.8021, lng: -122.4416 },
  { name: "North Beach", areaCode: "94133", lat: 37.8061, lng: -122.4103 },
  { name: "Hayes Valley", areaCode: "94102", lat: 37.7763, lng: -122.4247 },
  { name: "Castro", areaCode: "94114", lat: 37.7609, lng: -122.4350 },
  { name: "Haight", areaCode: "94117", lat: 37.7692, lng: -122.4481 },
  { name: "Richmond", areaCode: "94118", lat: 37.7799, lng: -122.4647 },
  { name: "Sunset", areaCode: "94122", lat: 37.7534, lng: -122.4952 },
  { name: "Potrero", areaCode: "94107", lat: 37.7595, lng: -122.3977 },
];

/** Deterministic PRNG so pins stay stable for a given place. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24) || "place";
}

/**
 * Build mock stays scattered around a USA location (city / ZIP / neighborhood).
 */
export function buildListingsAround(opts: {
  lat: number;
  lng: number;
  label: string;
  neighborhood: string;
  areaCode: string;
  count?: number;
}): PublicListing[] {
  const count = opts.count ?? 20;
  const seed = hashSeed(
    `${opts.lat.toFixed(4)},${opts.lng.toFixed(4)},${opts.label}`,
  );
  const rand = mulberry32(seed);
  const prefix = slugify(opts.neighborhood || opts.label);
  const listings: PublicListing[] = [];

  // ~city-scale jitter (~2–3 miles)
  const latSpan = 0.045;
  const lngSpan = 0.055;

  for (let i = 0; i < count; i++) {
    const style = STYLES[i % STYLES.length];
    const id = `${prefix}-${String(i + 1).padStart(2, "0")}`;
    const hoodLabel = i % 3 === 0
      ? opts.neighborhood
      : `${opts.neighborhood} ${["East", "West", "North", "South"][i % 4]}`;

    listings.push({
      id,
      name: `${hoodLabel} ${style}`,
      areaCode: opts.areaCode,
      neighborhood: hoodLabel,
      lat: opts.lat + (rand() - 0.5) * latSpan,
      lng: opts.lng + (rand() - 0.5) * lngSpan,
      priceLamports: PRICE_LAMPORTS,
      beds: 1 + (i % 3),
    });
  }

  // Anchor the first pin near the searched point.
  listings[0].lat = opts.lat + 0.002;
  listings[0].lng = opts.lng - 0.002;

  return listings;
}

function buildSfListings(): PublicListing[] {
  const rand = mulberry32(42);
  const listings: PublicListing[] = [];

  for (let i = 0; i < 20; i++) {
    const hood = SF_NEIGHBORHOODS[i % SF_NEIGHBORHOODS.length];
    const style = STYLES[i % STYLES.length];
    const id = `sf-${String(i + 1).padStart(2, "0")}`;

    listings.push({
      id,
      name: `${hood.name} ${style}`,
      areaCode: hood.areaCode,
      neighborhood: hood.name,
      lat: hood.lat + (rand() - 0.5) * 0.028,
      lng: hood.lng + (rand() - 0.5) * 0.036,
      priceLamports: PRICE_LAMPORTS,
      beds: 1 + (i % 3),
    });
  }

  listings[0].lat = SF_CENTER.lat + 0.006;
  listings[0].lng = SF_CENTER.lng - 0.004;
  return listings;
}

export const PUBLIC_LISTINGS: PublicListing[] = buildSfListings();

export function filterListings(
  listings: PublicListing[],
  query: string,
): PublicListing[] {
  const q = query.trim().toLowerCase();
  if (!q) return listings;

  // Token match so "Austin TX" still hits "Austin Loft" pins.
  const tokens = q.split(/[\s,]+/).filter((t) => t.length > 1);
  return listings.filter((l) => {
    const hay = `${l.name} ${l.neighborhood} ${l.areaCode}`.toLowerCase();
    if (hay.includes(q)) return true;
    return tokens.some((t) => hay.includes(t));
  });
}
