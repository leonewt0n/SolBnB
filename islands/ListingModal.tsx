import { useState } from "preact/hooks";
import { PRICE_SOL_LABEL } from "../lib/constants.ts";
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

type Props = {
  listingProgramId?: string;
};

export default function ListingModal({ listingProgramId = "" }: Props) {
  if (!listingOpen.value) return null;

  const pin = pendingPin.value;
  const connected = !!walletAddress.value;

  const [name, setName] = useState("");
  const [neighborhood, setNeighborhood] = useState(placeLabel.value);
  const [areaCode, setAreaCode] = useState("");
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
      });
      const listingId = result.listingPda;
      const signature = result.signature;

      const hostPubkey = walletAddress.value ?? undefined;
      const listingPayload = {
        listingId,
        name: name.trim(),
        neighborhood: neighborhood.trim() || placeLabel.value,
        areaCode: areaCode.trim() || "00000",
        beds,
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
        beds,
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
            ? (
              <>
                Pin {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)} ·{" "}
                {PRICE_SOL_LABEL} per booking
              </>
            )
            : <>Click the map to drop a pin · {PRICE_SOL_LABEL} per booking</>}
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
            <span>Neighborhood</span>
            <input
              type="text"
              placeholder="Mission"
              value={neighborhood}
              onInput={(e) =>
                setNeighborhood((e.target as HTMLInputElement).value)}
            />
          </label>

          <div class="dates">
            <label class="dates__field">
              <span>ZIP / area code</span>
              <input
                type="text"
                placeholder="94110"
                value={areaCode}
                onInput={(e) =>
                  setAreaCode((e.target as HTMLInputElement).value)}
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
