import { PRICE_SOL_LABEL } from "../lib/constants.ts";
import { bookStay } from "./pay.ts";
import {
  checkIn,
  checkOut,
  lastSignature,
  resetBookingUi,
  selectListing,
  selected,
  txError,
  txStatus,
  unlock,
  walletAddress,
} from "./store.ts";

type Props = {
  merchantPubkey: string;
};

export default function BookingModal({ merchantPubkey }: Props) {
  const listing = selected.value;
  if (!listing) return null;

  const canBook = !!checkIn.value && !!checkOut.value &&
    checkOut.value > checkIn.value &&
    !!walletAddress.value &&
    txStatus.value !== "signing" &&
    txStatus.value !== "confirming" &&
    txStatus.value !== "done";

  async function onBook() {
    txError.value = null;
    unlock.value = null;
    txStatus.value = "signing";

    try {
      const signature = await bookStay(merchantPubkey);
      lastSignature.value = signature;
      txStatus.value = "confirming";

      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          listingId: listing!.id,
          signature,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Unlock failed (${res.status})`);
      }

      unlock.value = await res.json();
      txStatus.value = "done";
    } catch (err) {
      txStatus.value = "error";
      txError.value = err instanceof Error ? err.message : "Booking failed";
    }
  }

  return (
    <div
      class="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) selectListing(null);
      }}
    >
      <aside class="modal" role="dialog" aria-modal="true" aria-labelledby="booking-title">
        <button
          class="modal__close"
          type="button"
          aria-label="Close"
          onClick={() => selectListing(null)}
        >
          ×
        </button>

        <p class="modal__eyebrow">{listing.neighborhood} · {listing.areaCode}</p>
        <h2 id="booking-title" class="modal__title">{listing.name}</h2>
        <p class="modal__meta">
          {listing.beds} bed{listing.beds > 1 ? "s" : ""} · {PRICE_SOL_LABEL} flat
        </p>

        <div class="dates">
          <label class="dates__field">
            <span>Check-in</span>
            <input
              type="date"
              value={checkIn.value}
              onInput={(e) => {
                checkIn.value = (e.target as HTMLInputElement).value;
                resetBookingUi();
              }}
            />
          </label>
          <label class="dates__field">
            <span>Check-out</span>
            <input
              type="date"
              value={checkOut.value}
              min={checkIn.value || undefined}
              onInput={(e) => {
                checkOut.value = (e.target as HTMLInputElement).value;
                resetBookingUi();
              }}
            />
          </label>
        </div>

        {!walletAddress.value && (
          <p class="modal__hint">Connect a Devnet wallet to book this stay.</p>
        )}

        {txStatus.value !== "done" && (
          <button
            class="cta"
            type="button"
            disabled={!canBook}
            onClick={onBook}
          >
            {txStatus.value === "signing"
              ? "Approve in wallet…"
              : txStatus.value === "confirming"
              ? "Confirming on Devnet…"
              : `Book for ${PRICE_SOL_LABEL}`}
          </button>
        )}

        {txError.value && <p class="modal__error">{txError.value}</p>}

        {unlock.value && (
          <div class="access">
            <h3 class="access__title">You're checked in</h3>
            <p class="access__copy">
              On-chain payment confirmed. Physical access unlocked for{" "}
              {checkIn.value} → {checkOut.value}.
            </p>
            <dl class="access__grid">
              <div>
                <dt>Door code</dt>
                <dd>{unlock.value.doorCode}</dd>
              </div>
              <div>
                <dt>Wi-Fi</dt>
                <dd>{unlock.value.wifiPassword}</dd>
              </div>
            </dl>
            {lastSignature.value && (
              <a
                class="access__link"
                href={`https://explorer.solana.com/tx/${lastSignature.value}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
              >
                View transaction on Solana Explorer
              </a>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
