import { define } from "../../utils.ts";

type NominatimHit = {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  class?: string;
  address?: {
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    neighbourhood?: string;
    county?: string;
    state?: string;
  };
};

export type GeocodeResult = {
  lat: number;
  lng: number;
  label: string;
  areaCode: string;
  neighborhood: string;
};

export const handler = define.handlers({
  async GET(ctx) {
    const q = ctx.url.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return Response.json(
        { error: "Enter at least 2 characters" },
        { status: 400 },
      );
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("countrycodes", "us");
    url.searchParams.set("limit", "5");

    let hits: NominatimHit[];
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "SolBnB/1.0 (hackathon demo; contact: localhost)",
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        return Response.json(
          { error: `Geocoder error (${res.status})` },
          { status: 502 },
        );
      }
      hits = await res.json();
    } catch (err) {
      console.error("geocode failed", err);
      return Response.json({ error: "Geocoder unavailable" }, { status: 502 });
    }

    if (!hits.length) {
      return Response.json(
        { error: "No USA matches — try a city, neighborhood, or ZIP" },
        { status: 404 },
      );
    }

    const hit = hits[0];
    const addr = hit.address ?? {};
    const neighborhood = addr.neighbourhood || addr.suburb ||
      addr.city || addr.town || addr.village || addr.county || "Local";
    const areaCode = addr.postcode?.split("-")[0] || "00000";

    const result: GeocodeResult = {
      lat: Number(hit.lat),
      lng: Number(hit.lon),
      label: hit.display_name,
      areaCode,
      neighborhood,
    };

    return Response.json(result);
  },
});
