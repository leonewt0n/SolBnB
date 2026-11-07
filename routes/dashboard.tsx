import { define } from "../utils.ts";
import { DEFAULT_LISTING_PROGRAM_ID } from "../lib/onchainListings.ts";
import Dashboard from "../islands/Dashboard.tsx";

export default define.page(function DashboardPage() {
  const listingProgramId = Deno.env.get("LISTING_PROGRAM_ID")?.trim() ||
    DEFAULT_LISTING_PROGRAM_ID;

  return <Dashboard listingProgramId={listingProgramId} />;
});
