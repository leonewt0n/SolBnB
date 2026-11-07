import { useEffect, useState } from "preact/hooks";
import type { PublicListing } from "../data/listings.public.ts";
import {
  lamportsToSolLabel,
  MIN_PRICE_LAMPORTS,
  PRICE_LAMPORTS,
  solToLamports,
} from "../lib/constants.ts";
import { commitSecrets } from "./createListing.ts";
import { updateListingOnChain } from "./updateListing.ts";
import { upsertLocalHostListing } from "./store.ts";

const DESCRIPTION_MAX = 500;

type Props = {
  item: PublicListing;
  listingProgramId: string;
  wallet: string;
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onError: (message: string | null) => void;
  onDelete: () => void;
  onSaved: () => void;
};

export default function HostListingEditor({
  item,
  listingProgramId,
  wallet,
  busy,
  onBusy,
  onError,
  onDelete,
  onSaved,
}: Props) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [neighborhood, setNeighborhood] = useState(item.neighborhood);
  const [areaCode, setAreaCode] = useState(item.areaCode);
  const [beds, setBeds] = useState(item.beds);
  const [priceSol, setPriceSol] = useState(
    String((item.priceLamports || PRICE_LAMPORTS) / 1_000_000_000),
  );
  const [lat, setLat] = useState(String(item.lat));
  const [lng, setLng] = useState(String(item.lng));
  const [doorCode, setDoorCode] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [salt, setSalt] = useState("");
  const [secretsReady, setSecretsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/host-secrets?listingId=${
            encodeURIComponent(item.id)
          }&hostPubkey=${encodeURIComponent(wallet)}`,
        );
        if (!res.ok) {
          if (!cancelled) {
            setSecretsReady(true);
            onError("Could not load door / Wi-Fi for this listing.");
          }
          return;
        }
        const body = await res.json();
        if (cancelled) return;
        setDoorCode(body.secrets?.doorCode ?? "");
        setWifiPassword(body.secrets?.wifiPassword ?? "");
        setSalt(body.salt ?? crypto.randomUUID());
        if (body.listing) {
          setName(body.listing.name ?? item.name);
          setDescription(body.listing.description ?? "");
          setNeighborhood(body.listing.neighborhood ?? item.neighborhood);
          setAreaCode(body.listing.areaCode ?? item.areaCode);
          setBeds(body.listing.beds ?? item.beds);
          setPriceSol(
            String(
              (body.listing.priceLamports || PRICE_LAMPORTS) / 1_000_000_000,
            ),
          );
          setLat(String(body.listing.lat ?? item.lat));
          setLng(String(body.listing.lng ?? item.lng));
        }
        setSecretsReady(true);
      } catch {
        if (!cancelled) {
          setSecretsReady(true);
          onError("Could not load listing credentials.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item.id, wallet]);

  async function onSave(e: Event) {
    e.preventDefault();
    onError(null);

    const trimmedName = name.trim();
    const priceLamports = solToLamports(Number(priceSol));
    const nextLat = Number(lat);
    const nextLng = Number(lng);
    const trimmedDescription = description.trim().slice(0, DESCRIPTION_MAX);

    if (!trimmedName || trimmedName.length > 64) {
      onError("Title must be 1–64 characters.");
      return;
    }
    if (
      !Number.isFinite(priceLamports) ||
      priceLamports < MIN_PRICE_LAMPORTS
    ) {
      onError("Price must be at least 0.001 SOL.");
      return;
    }
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) {
      onError("Latitude and longitude must be numbers.");
      return;
    }
    if (!doorCode.trim() || !wifiPassword.trim()) {
      onError("Door passkey and Wi-Fi password are required.");
      return;
    }
    if (!listingProgramId) {
      onError("Listing program is not configured.");
      return;
    }

    onBusy(true);
    try {
      const nextSalt = salt || crypto.randomUUID();
      const commitment = await commitSecrets(
        doorCode.trim(),
        wifiPassword.trim(),
        nextSalt,
      );
      const commitmentHex = [...commitment]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      await updateListingOnChain({
        programId: listingProgramId,
        listingPda: item.id,
        name: trimmedName,
        lat: nextLat,
        lng: nextLng,
        secretsCommitment: commitment,
        priceLamports,
      });

      const listingPayload = {
        listingId: item.id,
        hostPubkey: wallet,
        name: trimmedName,
        description: trimmedDescription,
        neighborhood: neighborhood.trim() || "Host stay",
        areaCode: areaCode.trim() || "00000",
        beds,
        priceLamports,
        lat: nextLat,
        lng: nextLng,
        doorCode: doorCode.trim(),
        wifiPassword: wifiPassword.trim(),
        salt: nextSalt,
        commitmentHex,
      };

      const res = await fetch("/api/host-secrets", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(listingPayload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save off-chain details");
      }
      const body = await res.json();
      const saved = body.listing as PublicListing;
      upsertLocalHostListing(saved);
      setSalt(nextSalt);
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save listing");
    } finally {
      onBusy(false);
    }
  }

  return (
    <li class="dashboard__card">
      <form class="dashboard__edit" onSubmit={onSave}>
        <div class="dashboard__card-head">
          <p class="dashboard__row-name">{item.name}</p>
          <span class="dashboard__badge dashboard__badge--active">active</span>
        </div>

        <label class="listing-form__field">
          <span>Title</span>
          <input
            type="text"
            value={name}
            maxLength={64}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            required
          />
        </label>

        <label class="listing-form__field">
          <span>Description</span>
          <textarea
            value={description}
            maxLength={DESCRIPTION_MAX}
            rows={3}
            onInput={(e) =>
              setDescription((e.target as HTMLTextAreaElement).value)}
          />
          <span class="listing-form__count">
            {description.length}/{DESCRIPTION_MAX}
          </span>
        </label>

        <div class="dates">
          <label class="dates__field">
            <span>Neighborhood</span>
            <input
              type="text"
              value={neighborhood}
              onInput={(e) =>
                setNeighborhood((e.target as HTMLInputElement).value)}
            />
          </label>
          <label class="dates__field">
            <span>ZIP / area code</span>
            <input
              type="text"
              value={areaCode}
              onInput={(e) =>
                setAreaCode((e.target as HTMLInputElement).value)}
            />
          </label>
        </div>

        <div class="dates">
          <label class="dates__field">
            <span>Price (SOL)</span>
            <input
              type="number"
              min={MIN_PRICE_LAMPORTS / 1_000_000_000}
              step="0.001"
              value={priceSol}
              onInput={(e) =>
                setPriceSol((e.target as HTMLInputElement).value)}
              required
            />
          </label>
          <label class="dates__field">
            <span>Beds</span>
            <input
              type="number"
              min={1}
              max={8}
              value={beds}
              onInput={(e) =>
                setBeds(Number((e.target as HTMLInputElement).value) || 1)}
            />
          </label>
        </div>

        <div class="dates">
          <label class="dates__field">
            <span>Latitude</span>
            <input
              type="number"
              step="any"
              value={lat}
              onInput={(e) => setLat((e.target as HTMLInputElement).value)}
              required
            />
          </label>
          <label class="dates__field">
            <span>Longitude</span>
            <input
              type="number"
              step="any"
              value={lng}
              onInput={(e) => setLng((e.target as HTMLInputElement).value)}
              required
            />
          </label>
        </div>

        <div class="dates">
          <label class="dates__field">
            <span>Door passkey</span>
            <input
              type="text"
              value={doorCode}
              onInput={(e) =>
                setDoorCode((e.target as HTMLInputElement).value)}
              required
              autoComplete="off"
              disabled={!secretsReady}
            />
          </label>
          <label class="dates__field">
            <span>Wi-Fi password</span>
            <input
              type="text"
              value={wifiPassword}
              onInput={(e) =>
                setWifiPassword((e.target as HTMLInputElement).value)}
              required
              autoComplete="off"
              disabled={!secretsReady}
            />
          </label>
        </div>

        <p class="dashboard__row-meta">
          On-chain: title, pin, price, secrets hash · Off-chain: description,
          beds, neighborhood, credentials · Min{" "}
          {lamportsToSolLabel(MIN_PRICE_LAMPORTS)}
        </p>

        <div class="dashboard__row-actions">
          <button
            type="submit"
            class="dashboard__price"
            disabled={busy || !secretsReady}
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            class="dashboard__delete"
            disabled={busy}
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      </form>
    </li>
  );
}
