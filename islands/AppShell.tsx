import type { PublicListing } from "../data/listings.public.ts";
import { listings, placeLabel } from "./store.ts";
import BookingModal from "./BookingModal.tsx";
import MapView from "./MapView.tsx";
import SearchBar from "./SearchBar.tsx";
import WalletButton from "./WalletButton.tsx";

type Props = {
  initialListings: PublicListing[];
  merchantPubkey: string;
};

/**
 * Single island keeps shared Preact signals in one client bundle.
 * Solana web3 is loaded from the CDN IIFE (see pay.ts / _app.tsx).
 */
export default function AppShell(
  { initialListings, merchantPubkey }: Props,
) {
  if (listings.value.length === 0) {
    listings.value = initialListings;
  }

  return (
    <div class="app">
      <header class="topbar">
        <div class="topbar__brand">
          <span class="topbar__mark">SolBnB</span>
          <span class="topbar__tag">
            Devnet stays · {placeLabel.value}
          </span>
        </div>
        <div class="topbar__tools">
          <SearchBar />
          <WalletButton />
        </div>
      </header>

      <main class="stage">
        <MapView />
      </main>

      <BookingModal merchantPubkey={merchantPubkey} />
    </div>
  );
}
