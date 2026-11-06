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
};

const NEIGHBORHOODS: Array<{ name: string; areaCode: string; lat: number; lng: number }> = [
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

const STYLES = [
  "Loft",
  "Victorian Flat",
  "Garden Studio",
  "Bay View Room",
  "Townhouse Suite",
  "Artist Pad",
];

/** Deterministic PRNG so pins stay stable across reloads. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildListings(): PublicListing[] {
  const rand = mulberry32(42);
  const listings: PublicListing[] = [];

  for (let i = 0; i < 20; i++) {
    const hood = NEIGHBORHOODS[i % NEIGHBORHOODS.length];
    const style = STYLES[i % STYLES.length];
    const jitterLat = (rand() - 0.5) * 0.028;
    const jitterLng = (rand() - 0.5) * 0.036;
    const id = `sf-${String(i + 1).padStart(2, "0")}`;

    listings.push({
      id,
      name: `${hood.name} ${style}`,
      areaCode: hood.areaCode,
      neighborhood: hood.name,
      lat: hood.lat + jitterLat,
      lng: hood.lng + jitterLng,
      priceLamports: PRICE_LAMPORTS,
      beds: 1 + (i % 3),
    });
  }

  // Keep a couple near the classic SF center for the opening viewport.
  listings[0].lat = SF_CENTER.lat + 0.006;
  listings[0].lng = SF_CENTER.lng - 0.004;

  return listings;
}

export const PUBLIC_LISTINGS: PublicListing[] = buildListings();

export function filterListings(
  listings: PublicListing[],
  query: string,
): PublicListing[] {
  const q = query.trim().toLowerCase();
  if (!q) return listings;
  return listings.filter((l) =>
    l.name.toLowerCase().includes(q) ||
    l.areaCode.includes(q) ||
    l.neighborhood.toLowerCase().includes(q)
  );
}
