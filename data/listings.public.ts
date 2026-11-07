export type PublicListing = {
  id: string;
  name: string;
  /** Host-written stay blurb (create form; max 500 chars). */
  description?: string;
  lat: number;
  lng: number;
  priceLamports: number;
  beds: number;
  /** Host wallet that created the listing (when known). */
  hostPubkey?: string;
};

/** Drop legacy neighborhood / ZIP keys from older stored JSON. */
export function sanitizePublicListing(raw: unknown): PublicListing | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.name !== "string") return null;
  const lat = Number(r.lat);
  const lng = Number(r.lng);
  const priceLamports = Number(r.priceLamports);
  const beds = Number(r.beds);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: r.id,
    name: r.name,
    ...(typeof r.description === "string" && r.description
      ? { description: r.description }
      : {}),
    lat,
    lng,
    priceLamports: Number.isFinite(priceLamports) ? priceLamports : 0,
    beds: Number.isFinite(beds) ? beds : 1,
    ...(typeof r.hostPubkey === "string" ? { hostPubkey: r.hostPubkey } : {}),
  };
}

export function filterListings(
  listings: PublicListing[],
  query: string,
): PublicListing[] {
  const q = query.trim().toLowerCase();
  if (!q) return listings;

  // Token match so "Austin TX" still hits "Austin Loft" pins.
  const tokens = q.split(/[\s,]+/).filter((t) => t.length > 1);
  return listings.filter((l) => {
    const hay = `${l.name} ${l.description ?? ""}`.toLowerCase();
    if (hay.includes(q)) return true;
    return tokens.some((t) => hay.includes(t));
  });
}
