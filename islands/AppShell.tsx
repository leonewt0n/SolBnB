import type { PublicListing } from "../data/listings.public.ts";
import { listings } from "./store.ts";
import BookingModal from "./BookingModal.tsx";
import ListingRail from "./ListingRail.tsx";
import MapView from "./MapView.tsx";
import SearchBar from "./SearchBar.tsx";
import WalletButton from "./WalletButton.tsx";

type Props = {
  initialListings: PublicListing[];
  merchantPubkey: string;
};

/**
 * Single island keeps shared Preact signals in one client bundle.
 * Solana web3 is loaded lazily from esm.sh inside pay.ts (not at module top-level)
 * so map hydration is not blocked by Node bare specifiers.
 */
export default function AppShell(
  { initialListings, merchantPubkey }: Props,
) {
  if (listings.value !== initialListings) {
    listings.value = initialListings;
  }

  return (
    <div class="app">
      <header class="topbar">
        <div class="topbar__brand">
          <span class="topbar__mark">SolBnB</span>
          <span class="topbar__tag">Devnet stays in San Francisco</span>
        </div>
        <div class="topbar__tools">
          <SearchBar />
          <WalletButton />
        </div>
      </header>

      <main class="stage">
        <MapView />
        <ListingRail />
      </main>

      <BookingModal merchantPubkey={merchantPubkey} />
    </div>
  );
}
