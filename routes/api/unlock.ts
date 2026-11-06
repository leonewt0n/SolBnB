import { define } from "../../utils.ts";
import { getSecrets } from "../../data/listings.secrets.ts";
import { getConnection } from "../../lib/solana.ts";
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

    const secrets = getSecrets(listingId);
    if (!secrets) {
      return Response.json({ error: "Unknown listing" }, { status: 404 });
    }

    try {
      const ok = await verifyBookingPayment(getConnection(), signature);
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
