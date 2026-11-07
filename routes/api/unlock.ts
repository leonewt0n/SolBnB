import { define } from "../../utils.ts";
import { getHostRecord } from "../../data/hostStore.ts";
import { getSecrets } from "../../data/listings.secrets.ts";
import { MIN_PRICE_LAMPORTS } from "../../lib/constants.ts";
import { fetchOnChainListing } from "../../lib/onchainListings.ts";
import { getConnection, getMerchantWallet } from "../../lib/solana.ts";
import { verifyBookingPayment } from "../../lib/verifyPayment.ts";

type UnlockBody = {
  listingId?: string;
  signature?: string;
};

export const handler = define.handlers({
  async POST(ctx) {
    let body: UnlockBody;
    try {
      body = await ctx.req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const listingId = body.listingId?.trim();
    const signature = body.signature?.trim();

    if (!listingId || !signature) {
      return Response.json(
        { error: "listingId and signature are required" },
        { status: 400 },
      );
    }

    const secrets = await getSecrets(listingId);
    if (!secrets) {
      return Response.json({ error: "Unknown listing" }, { status: 404 });
    }

    const connection = getConnection();
    const onChain = await fetchOnChainListing(listingId, connection);
    const hosted = await getHostRecord(listingId);

    const hostPubkey = onChain?.hostPubkey ?? hosted?.listing.hostPubkey;
    const priceLamports = onChain?.priceLamports ??
      hosted?.listing.priceLamports ??
      MIN_PRICE_LAMPORTS;

    if (!hostPubkey) {
      return Response.json(
        { error: "Listing host unknown — cannot verify payment" },
        { status: 400 },
      );
    }

    const merchantPubkey = getMerchantWallet();

    try {
      const ok = await verifyBookingPayment(
        connection,
        signature,
        hostPubkey,
        merchantPubkey,
        priceLamports,
      );
      if (!ok) {
        return Response.json(
          { error: "Payment not confirmed on Devnet" },
          { status: 402 },
        );
      }
    } catch (err) {
      console.error("unlock verify failed", err);
      return Response.json(
        { error: "Could not verify transaction" },
        { status: 502 },
      );
    }

    return Response.json(secrets);
  },
});
