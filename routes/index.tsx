import { define } from "../utils.ts";
import { getHostListings } from "../data/hostStore.ts";
import { DEFAULT_LISTING_PROGRAM_ID } from "../lib/onchainListings.ts";
import { getMerchantWallet } from "../lib/solana.ts";
import AppShell from "../islands/AppShell.tsx";

export default define.page(async function Home() {
  const merchantPubkey = getMerchantWallet();
  const listingProgramId = Deno.env.get("LISTING_PROGRAM_ID")?.trim() ||
    DEFAULT_LISTING_PROGRAM_ID;

  // Fast path only — never block HTML/map on Devnet getProgramAccounts.
  // Client refreshes chain pins via /api/listings after load.
  const hostListings = await getHostListings();

  return (
    <AppShell
      initialHostListings={hostListings}
      merchantPubkey={merchantPubkey}
      listingProgramId={listingProgramId}
    />
  );
});
