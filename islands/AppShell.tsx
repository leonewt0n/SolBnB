import { useEffect } from "preact/hooks";
import { IS_BROWSER } from "fresh/runtime";
import type { PublicListing } from "../data/listings.public.ts";
import {
  cancelCreateListing,
  creationMode,
  hydrateHostListings,
  mergeHostListings,
  startCreateListing,
  walletAddress,
} from "./store.ts";
import AccountModal from "./AccountModal.tsx";
import BookingModal from "./BookingModal.tsx";
import ListingModal from "./ListingModal.tsx";
import MapView from "./MapView.tsx";
import SearchBar from "./SearchBar.tsx";
import WalletButton from "./WalletButton.tsx";

type Props = {
  initialHostListings?: PublicListing[];
  merchantPubkey: string;
  listingProgramId?: string;
};

/**
 * Single island keeps shared Preact signals in one client bundle.
 * Solana web3 is loaded from the CDN IIFE (see pay.ts / _app.tsx).
 */
export default function AppShell(
  {
    initialHostListings = [],
    merchantPubkey,
    listingProgramId = "",
  }: Props,
) {
  // Hydrate once — never re-assign empty hosts every render (that froze the page).
  hydrateHostListings(initialHostListings);

  useEffect(() => {
    if (!IS_BROWSER) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/listings");
        if (!res.ok || cancelled) return;
        const body = await res.json();
        if (!cancelled && Array.isArray(body)) {
          mergeHostListings(body as PublicListing[]);
        }
      } catch (err) {
        console.error("Failed to refresh on-chain listings", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const creating = creationMode.value;

  return (
    <div class="app">
      <header class="topbar">
        <div class="topbar__brand">
          <span class="topbar__mark">SolBnB</span>
          <span class="topbar__tag">
            Your Home On Solana.
          </span>
        </div>
        <div class="topbar__tools">
          <SearchBar />
          {creating
            ? (
              <button
                type="button"
                class="listing-btn listing-btn--active"
                onClick={() => cancelCreateListing()}
              >
                Cancel pin
              </button>
            )
            : (
              <button
                type="button"
                class="listing-btn"
                onClick={() => {
                  if (!walletAddress.value) {
                    alert("Connect your wallet to list a stay.");
                    return;
                  }
                  startCreateListing();
                }}
              >
                List
              </button>
            )}
          <WalletButton />
        </div>
      </header>

      {creating && (
        <div class="create-banner" role="status">
          Click the map to drop your stay pin
        </div>
      )}

      <main class="stage">
        <MapView />
      </main>

      <BookingModal merchantPubkey={merchantPubkey} />
      <ListingModal listingProgramId={listingProgramId} />
      <AccountModal />
    </div>
  );
}
