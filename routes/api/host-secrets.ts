import { define } from "../../utils.ts";
import {
  deleteHostRecord,
  getHostRecord,
  upsertHostRecord,
} from "../../data/hostStore.ts";
import { MIN_PRICE_LAMPORTS, PRICE_LAMPORTS } from "../../lib/constants.ts";
import type { PublicListing } from "../../data/listings.public.ts";

type Body = {
  listingId?: string;
  doorCode?: string;
  wifiPassword?: string;
  salt?: string;
  signature?: string | null;
  commitmentHex?: string;
  name?: string;
  description?: string;
  beds?: number;
  lat?: number;
  lng?: number;
  hostPubkey?: string;
  priceLamports?: number;
};

function assertHost(
  existingHost: string | undefined,
  hostPubkey: string,
): Response | null {
  if (existingHost && existingHost !== hostPubkey) {
    return Response.json(
      { error: "Only the listing host can modify this record" },
      { status: 403 },
    );
  }
  return null;
}

/**
 * Persists host public pin + door/Wi-Fi off-chain.
 * Survives refresh and wallet disconnect.
 */
export const handler = define.handlers({
  /** Host reads door / Wi-Fi for their own listing (dashboard editor). */
  async GET(ctx) {
    const url = new URL(ctx.req.url);
    const listingId = url.searchParams.get("listingId")?.trim();
    const hostPubkey = url.searchParams.get("hostPubkey")?.trim();
    if (!listingId || !hostPubkey) {
      return Response.json(
        { error: "listingId and hostPubkey are required" },
        { status: 400 },
      );
    }

    const existing = await getHostRecord(listingId);
    if (!existing) {
      return Response.json({ error: "Unknown listing" }, { status: 404 });
    }
    const denied = assertHost(existing.listing.hostPubkey, hostPubkey);
    if (denied) return denied;

    return Response.json({
      listing: existing.listing,
      secrets: existing.secrets,
      salt: existing.salt ?? null,
    });
  },

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
    const rawPrice = Number(body.priceLamports);
    const priceLamports =
      Number.isFinite(rawPrice) && rawPrice >= MIN_PRICE_LAMPORTS
        ? Math.floor(rawPrice)
        : PRICE_LAMPORTS;
    const listing: PublicListing = {
      id: listingId,
      name,
      ...(description ? { description } : {}),
      lat,
      lng,
      priceLamports,
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

  /** Host mirrors an on-chain listing update into the off-chain store. */
  async PATCH(ctx) {
    let body: Body;
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
    if (!existing) {
      return Response.json({ error: "Unknown listing" }, { status: 404 });
    }
    const denied = assertHost(existing.listing.hostPubkey, hostPubkey);
    if (denied) return denied;

    const name = body.name?.trim() ?? existing.listing.name;
    const lat = body.lat != null ? Number(body.lat) : existing.listing.lat;
    const lng = body.lng != null ? Number(body.lng) : existing.listing.lng;
    const rawPrice = body.priceLamports != null
      ? Number(body.priceLamports)
      : existing.listing.priceLamports;
    const description = body.description !== undefined
      ? body.description.trim()
      : (existing.listing.description ?? "");
    const doorCode = body.doorCode?.trim() ?? existing.secrets.doorCode;
    const wifiPassword = body.wifiPassword?.trim() ??
      existing.secrets.wifiPassword;

    if (!name || name.length > 64) {
      return Response.json(
        { error: "Name must be 1–64 characters" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return Response.json({ error: "Invalid lat/lng" }, { status: 400 });
    }
    if (!Number.isFinite(rawPrice) || rawPrice < MIN_PRICE_LAMPORTS) {
      return Response.json(
        { error: "priceLamports must be at least 0.001 SOL" },
        { status: 400 },
      );
    }
    if (description.length > 500) {
      return Response.json(
        { error: "Description must be 500 characters or fewer" },
        { status: 400 },
      );
    }
    if (!doorCode || !wifiPassword) {
      return Response.json(
        { error: "Door passkey and Wi-Fi password are required" },
        { status: 400 },
      );
    }
    if (doorCode.length > 64 || wifiPassword.length > 128) {
      return Response.json({ error: "Credential too long" }, { status: 400 });
    }

    const { description: _prevDescription, ...rest } = existing.listing;
    const listing: PublicListing = {
      ...rest,
      name,
      ...(description ? { description } : {}),
      lat,
      lng,
      priceLamports: Math.floor(rawPrice),
      beds: Math.max(
        1,
        Math.min(8, Number(body.beds ?? existing.listing.beds) || 1),
      ),
      hostPubkey: existing.listing.hostPubkey ?? hostPubkey,
    };

    await upsertHostRecord({
      listing,
      secrets: { doorCode, wifiPassword },
      salt: body.salt ?? existing.salt,
      commitmentHex: body.commitmentHex ?? existing.commitmentHex,
      signature: body.signature ?? existing.signature ?? null,
    });

    return Response.json({ ok: true, listing });
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
