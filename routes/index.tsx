import { define } from "../utils.ts";
import { PUBLIC_LISTINGS } from "../data/listings.public.ts";
import { getMerchantWallet } from "../lib/solana.ts";
import AppShell from "../islands/AppShell.tsx";

export default define.page(function Home() {
  const merchantPubkey = getMerchantWallet();

  return (
    <AppShell
      initialListings={PUBLIC_LISTINGS}
      merchantPubkey={merchantPubkey}
    />
  );
});
