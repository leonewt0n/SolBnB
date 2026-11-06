import { filteredListings, selectListing } from "./store.ts";

export default function ListingRail() {
  const results = filteredListings.value;

  return (
    <aside class="rail" aria-label="Matching stays">
      <p class="rail__count">
        {results.length} stay{results.length === 1 ? "" : "s"}
      </p>
      <ul class="rail__list">
        {results.map((listing) => (
          <li key={listing.id}>
            <button
              type="button"
              class="rail__item"
              onClick={() => selectListing(listing)}
            >
              <strong>{listing.name}</strong>
              <span>
                {listing.neighborhood} · {listing.areaCode}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
