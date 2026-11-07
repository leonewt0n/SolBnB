import { useState } from "preact/hooks";
import { PRICE_SOL_LABEL, SF_CENTER } from "../lib/constants.ts";
import {
  addHostListing,
  listingOpen,
  mapTarget,
  placeLabel,
  selectListing,
  walletAddress,
} from "./store.ts";

export default function ListingModal() {
  if (!listingOpen.value) return null;

  const connected = !!walletAddress.value;
  const [name, setName] = useState("");
  const [neighborhood, setNeighborhood] = useState(placeLabel.value);
  const [areaCode, setAreaCode] = useState("");
  const [beds, setBeds] = useState(1);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: Event) {
    e.preventDefault();
    setError(null);

    if (!connected) {
      setError("Connect your wallet before listing a stay.");
      return;
    }
    if (!name.trim()) {
      setError("Give your stay a name.");
      return;
    }

    const center = mapTarget.value ?? {
      lat: SF_CENTER.lat,
      lng: SF_CENTER.lng,
    };

    const listing = addHostListing({
      name: name.trim(),
      neighborhood: neighborhood.trim() || placeLabel.value,
      areaCode: areaCode.trim() || "00000",
      beds,
      lat: center.lat + (Math.random() - 0.5) * 0.01,
      lng: center.lng + (Math.random() - 0.5) * 0.01,
    });

    listingOpen.value = false;
    selectListing(listing);
  }

  return (
    <div
      class="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) listingOpen.value = false;
      }}
    >
      <aside
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="listing-title"
      >
        <button
          class="modal__close"
          type="button"
          aria-label="Close"
          onClick={() => {
            listingOpen.value = false;
          }}
        >
          ×
        </button>

        <p class="modal__eyebrow">Host</p>
        <h2 id="listing-title" class="modal__title">List a stay</h2>
        <p class="modal__meta">
          Pin a rental on the current map area · {PRICE_SOL_LABEL} per booking
        </p>

        <form class="listing-form" onSubmit={onSubmit}>
          <label class="listing-form__field">
            <span>Title</span>
            <input
              type="text"
              placeholder="Sunny loft near downtown"
              value={name}
              onInput={(e) => setName((e.target as HTMLInputElement).value)}
              required
            />
          </label>

          <label class="listing-form__field">
            <span>Neighborhood</span>
            <input
              type="text"
              placeholder="Mission"
              value={neighborhood}
              onInput={(e) =>
                setNeighborhood((e.target as HTMLInputElement).value)}
            />
          </label>

          <div class="dates">
            <label class="dates__field">
              <span>ZIP / area code</span>
              <input
                type="text"
                placeholder="94110"
                value={areaCode}
                onInput={(e) =>
                  setAreaCode((e.target as HTMLInputElement).value)}
              />
            </label>
            <label class="dates__field">
              <span>Beds</span>
              <input
                type="number"
                min={1}
                max={8}
                value={beds}
                onInput={(e) =>
                  setBeds(
                    Number((e.target as HTMLInputElement).value) || 1,
                  )}
              />
            </label>
          </div>

          {!connected && (
            <p class="modal__hint">Connect a wallet to publish your listing.</p>
          )}
          {error && <p class="modal__error">{error}</p>}

          <button class="cta" type="submit" disabled={!connected}>
            Publish listing
          </button>
        </form>
      </aside>
    </div>
  );
}
