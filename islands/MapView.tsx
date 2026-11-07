import { useEffect, useRef } from "preact/hooks";
import { IS_BROWSER } from "fresh/runtime";
import type { Map as LeafletMap, Marker } from "leaflet";
import type { PublicListing } from "../data/listings.public.ts";
import { SF_CENTER } from "../lib/constants.ts";
import { filteredListings, mapTarget, selectListing } from "./store.ts";

type LeafletNS = typeof import("leaflet");

function getLeaflet(mod: LeafletNS | { default: LeafletNS }): LeafletNS {
  return ("map" in mod && typeof mod.map === "function")
    ? mod as LeafletNS
    : (mod as { default: LeafletNS }).default;
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const visible = filteredListings.value;
  const target = mapTarget.value;

  useEffect(() => {
    if (!IS_BROWSER || !containerRef.current || mapRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const mod = await import("leaflet");
        const L = getLeaflet(mod);

        if (cancelled || !containerRef.current) return;

        const el = containerRef.current;
        if (el.clientHeight === 0) {
          el.style.minHeight = "60vh";
        }

        const map = L.map(el, {
          zoomControl: false,
          attributionControl: true,
        }).setView([SF_CENTER.lat, SF_CENTER.lng], 13);

        L.control.zoom({ position: "bottomright" }).addTo(map);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        mapRef.current = map;
        requestAnimationFrame(() => {
          map.invalidateSize();
          syncMarkers(L, filteredListings.value);
        });
      } catch (err) {
        console.error("MapView failed to init Leaflet", err);
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!IS_BROWSER || !mapRef.current || !target) return;
    mapRef.current.flyTo([target.lat, target.lng], target.zoom, {
      duration: 1.2,
    });
  }, [target]);

  useEffect(() => {
    if (!IS_BROWSER || !mapRef.current) return;
    import("leaflet")
      .then((mod) => syncMarkers(getLeaflet(mod), visible))
      .catch((err) => console.error("MapView marker sync failed", err));
  }, [visible]);

  function syncMarkers(L: LeafletNS, listingsToShow: PublicListing[]) {
    const map = mapRef.current;
    if (!map) return;

    for (const marker of markersRef.current) {
      marker.remove();
    }
    markersRef.current = [];

    const pinIcon = L.divIcon({
      className: "solbnb-pin",
      html: '<span class="solbnb-pin__dot"></span>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    for (const listing of listingsToShow) {
      const marker = L.marker([listing.lat, listing.lng], { icon: pinIcon })
        .addTo(map)
        .bindTooltip(listing.name, { direction: "top", offset: [0, -8] });

      marker.on("click", () => {
        selectListing(listing);
      });

      markersRef.current.push(marker);
    }
  }

  return (
    <div
      class="map-shell"
      ref={containerRef}
      role="application"
      aria-label="USA rentals map"
    />
  );
}
