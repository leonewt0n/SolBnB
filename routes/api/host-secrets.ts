import { define } from "../../utils.ts";
import {
  deleteHostRecord,
  getHostRecord,
  upsertHostRecord,
} from "../../data/hostStore.ts";
import { PRICE_LAMPORTS } from "../../lib/constants.ts";
import type { PublicListing } from "../../data/listings.public.ts";

type Body = {
  listingId?: string;
  doorCode?: string;
  wifiPassword?: string;
  salt?: string;
  signature?: string | null;
  commitmentHex?: string;
  name?: string;
  neighborhood?: string;
  areaCode?: string;
  description?: string;
  beds?: number;
  lat?: number;
  lng?: number;
  hostPubkey?: string;
};

/**
 * Persists host public pin + door/Wi-Fi off-chain.
 * Survives refresh and wallet disconnect.
 */
export const handler = define.handlers({
  async POST(ctx) {
    let body: Body;
    try {
      body = await ctx.req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const listingId = body.listingId?.trim();
    const doorCode = body.doorCode?.trim();
    const wifiPassword = body.wifiPassword?.trim();
    const name = body.name?.trim();
    const lat = Number(body.lat);
    const lng = Number(body.lng);

    if (!listingId || !doorCode || !wifiPassword) {
      return Response.json(
        { error: "listingId, doorCode, and wifiPassword are required" },
        { status: 400 },
      );
    }

    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return Response.json(
        { error: "name, lat, and lng are required to persist the pin" },
        { status: 400 },
      );
    }

    if (doorCode.length > 64 || wifiPassword.length > 128) {
      return Response.json({ error: "Credential too long" }, { status: 400 });
    }

    const description = body.description?.trim() ?? "";
    if (description.length > 500) {
      return Response.json(
        { error: "Description must be 500 characters or fewer" },
        { status: 400 },
      );
    }

    const hostPubkey = body.hostPubkey?.trim();
    const listing: PublicListing = {
      id: listingId,
      name,
      neighborhood: body.neighborhood?.trim() || "Host stay",
      areaCode: body.areaCode?.trim() || "00000",
      ...(description ? { description } : {}),
      lat,
      lng,
      priceLamports: PRICE_LAMPORTS,
      beds: Math.max(1, Math.min(8, Number(body.beds) || 1)),
      ...(hostPubkey ? { hostPubkey } : {}),
    };

    await upsertHostRecord({
      listing,
      secrets: { doorCode, wifiPassword },
      salt: body.salt,
      commitmentHex: body.commitmentHex,
      signature: body.signature ?? null,
    });

    return Response.json({
      ok: true,
      listing,
      commitmentHex: body.commitmentHex ?? null,
      signature: body.signature ?? null,
    });
  },

  /** Host removes off-chain secrets after closing the Listing PDA. */
  async DELETE(ctx) {
    let body: { listingId?: string; hostPubkey?: string };
    try {
      body = await ctx.req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const listingId = body.listingId?.trim();
    const hostPubkey = body.hostPubkey?.trim();
    if (!listingId || !hostPubkey) {
      return Response.json(
        { error: "listingId and hostPubkey are required" },
        { status: 400 },
      );
    }

    const existing = await getHostRecord(listingId);
    if (
      existing?.listing.hostPubkey &&
      existing.listing.hostPubkey !== hostPubkey
    ) {
      return Response.json(
        { error: "Only the listing host can delete this record" },
        { status: 403 },
      );
    }

    // Always tombstone so getProgramAccounts cannot resurrect the pin.
    await deleteHostRecord(listingId);

    return Response.json({ ok: true, listingId });
  },
});
