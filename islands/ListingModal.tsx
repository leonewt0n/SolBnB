import { useState } from "preact/hooks";
import {
  lamportsToSolLabel,
  MIN_PRICE_LAMPORTS,
  PRICE_LAMPORTS,
  solToLamports,
} from "../lib/constants.ts";
import {
  addHostListing,
  cancelCreateListing,
  listingOpen,
  pendingPin,
  placeLabel,
  selectListing,
  walletAddress,
} from "./store.ts";
import { commitSecrets, createListingOnChain } from "./createListing.ts";

const DESCRIPTION_MAX = 500;
const DEFAULT_PRICE_SOL = PRICE_LAMPORTS / 1_000_000_000;

type Props = {
  listingProgramId?: string;
};

export default function ListingModal({ listingProgramId = "" }: Props) {
  if (!listingOpen.value) return null;

  const pin = pendingPin.value;
  const connected = !!walletAddress.value;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceSol, setPriceSol] = useState(String(DEFAULT_PRICE_SOL));
  const [beds, setBeds] = useState(1);
  const [doorCode, setDoorCode] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: Event) {
    e.preventDefault();
    setError(null);

    if (!connected) {
      setError("Connect your wallet before listing a stay.");
      return;
    }
    if (!pin) {
      setError("Click the map to set your GPS pin first.");
      return;
    }
    if (!name.trim()) {
      setError("Give your stay a name.");
      return;
    }
    if (description.trim().length > DESCRIPTION_MAX) {
      setError(`Description must be ${DESCRIPTION_MAX} characters or fewer.`);
      return;
    }
    const priceLamports = solToLamports(Number(priceSol));
    if (
      !Number.isFinite(priceLamports) ||
      priceLamports < MIN_PRICE_LAMPORTS
    ) {
      setError("Price must be at least 0.001 SOL.");
      return;
    }
    if (!doorCode.trim() || !wifiPassword.trim()) {
      setError("Door passkey and Wi-Fi password are required.");
      return;
    }

    setBusy(true);
    try {
      const salt = crypto.randomUUID();
      const nonce = BigInt(Date.now());
      const commitment = await commitSecrets(
        doorCode.trim(),
        wifiPassword.trim(),
        salt,
      );

      if (!listingProgramId) {
        throw new Error(
          "LISTING_PROGRAM_ID is missing — cannot store pin on Solana.",
        );
      }

      const result = await createListingOnChain({
        programId: listingProgramId,
        name: name.trim(),
        lat: pin.lat,
        lng: pin.lng,
        nonce,
        secretsCommitment: commitment,
        priceLamports,
      });
      const listingId = result.listingPda;
      const signature = result.signature;

      const hostPubkey = walletAddress.value ?? undefined;
      const trimmedDescription = description.trim().slice(0, DESCRIPTION_MAX);
      const listingPayload = {
        listingId,
        name: name.trim(),
        neighborhood: placeLabel.value || "Host stay",
        areaCode: "00000",
        description: trimmedDescription,
        beds,
        priceLamports,
        lat: pin.lat,
        lng: pin.lng,
        doorCode: doorCode.trim(),
        wifiPassword: wifiPassword.trim(),
        salt,
        signature,
        hostPubkey,
        commitmentHex: [...commitment]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""),
      };

      const secretsRes = await fetch("/api/host-secrets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(listingPayload),
      });
      if (!secretsRes.ok) {
        const body = await secretsRes.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to store gated credentials");
      }

      const listing = addHostListing({
        id: listingId,
        name: listingPayload.name,
        neighborhood: listingPayload.neighborhood,
        areaCode: listingPayload.areaCode,
        description: listingPayload.description,
        beds,
        priceLamports,
        lat: pin.lat,
        lng: pin.lng,
        hostPubkey,
      });

      cancelCreateListing();
      selectListing(listing);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not publish listing",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      class="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) cancelCreateListing();
      }}
    >
      <aside
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="listing-title"
      >
        <button
          class="modal__close"
          type="button"
          aria-label="Close"
          onClick={() => cancelCreateListing()}
        >
          ×
        </button>

        <p class="modal__eyebrow">Host</p>
        <h2 id="listing-title" class="modal__title">List a stay</h2>
        <p class="modal__meta">
          {pin
            ? <>Pin {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</>
            : <>Click the map to drop a pin</>}
          {" "}· renters pay you on-chain
        </p>

        <form class="listing-form" onSubmit={onSubmit}>
          <label class="listing-form__field">
            <span>Title</span>
            <input
              type="text"
              placeholder="Sunny loft near downtown"
              value={name}
              onInput={(e) => setName((e.target as HTMLInputElement).value)}
              required
            />
          </label>

          <label class="listing-form__field">
            <span>Description</span>
            <textarea
              placeholder="Quiet spot with great light, walkable cafes, and easy transit."
              value={description}
              maxLength={DESCRIPTION_MAX}
              rows={4}
              onInput={(e) =>
                setDescription((e.target as HTMLTextAreaElement).value)}
            />
            <span class="listing-form__count">
              {description.length}/{DESCRIPTION_MAX}
            </span>
          </label>

          <div class="dates">
            <label class="dates__field">
              <span>Price (SOL)</span>
              <input
                type="number"
                min={DEFAULT_PRICE_SOL}
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
                  setBeds(
                    Number((e.target as HTMLInputElement).value) || 1,
                  )}
              />
            </label>
          </div>
          <p class="modal__hint">
            Minimum {lamportsToSolLabel(MIN_PRICE_LAMPORTS)}. Paid to your
            wallet on each booking.
          </p>

          <label class="listing-form__field">
            <span>Door passkey</span>
            <input
              type="text"
              placeholder="482910"
              value={doorCode}
              onInput={(e) => setDoorCode((e.target as HTMLInputElement).value)}
              required
              autoComplete="off"
            />
          </label>

          <label class="listing-form__field">
            <span>Wi-Fi password</span>
            <input
              type="text"
              placeholder="guest-network-pass"
              value={wifiPassword}
              onInput={(e) =>
                setWifiPassword((e.target as HTMLInputElement).value)}
              required
              autoComplete="off"
            />
          </label>

          <p class="modal__hint">
            GPS pin is written to a Solana Devnet Listing account. Door / Wi-Fi
            stay off-chain; only a hash commitment goes on-chain.
          </p>

          {!connected && (
            <p class="modal__hint">Connect a wallet to publish your listing.</p>
          )}
          {error && <p class="modal__error">{error}</p>}

          <button
            class="cta"
            type="submit"
            disabled={!connected || !pin || busy || !listingProgramId}
          >
            {busy ? "Signing on Solana…" : "Sign & publish on-chain"}
          </button>
        </form>
      </aside>
    </div>
  );
}
