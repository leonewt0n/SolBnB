import { lamportsToSolLabel, PRICE_LAMPORTS } from "../lib/constants.ts";
import { bookStay } from "./pay.ts";
import {
  addBooking,
  checkIn,
  checkOut,
  lastSignature,
  resetBookingUi,
  selected,
  selectListing,
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

  const priceLamports = listing.priceLamports || PRICE_LAMPORTS;
  const priceLabel = lamportsToSolLabel(priceLamports);
  const hostPubkey = listing.hostPubkey;
  const wallet = walletAddress.value;
  const isOwner = !!wallet && !!hostPubkey && wallet === hostPubkey;

  const canBook = !isOwner &&
    !!checkIn.value && !!checkOut.value &&
    checkOut.value > checkIn.value &&
    !!wallet &&
    !!hostPubkey &&
    !!merchantPubkey &&
    txStatus.value !== "signing" &&
    txStatus.value !== "confirming" &&
    txStatus.value !== "done";

  async function onBook() {
    txError.value = null;
    unlock.value = null;

    if (isOwner) {
      txError.value = "You own this stay — booking is disabled.";
      return;
    }

    txStatus.value = "signing";

    try {
      if (!hostPubkey) {
        throw new Error("Listing host unknown — cannot pay.");
      }
      if (!merchantPubkey) {
        throw new Error("Merchant wallet is not configured.");
      }
      const signature = await bookStay(
        hostPubkey,
        merchantPubkey,
        priceLamports,
      );
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

      const renter = walletAddress.value;
      if (renter) {
        addBooking({
          listingId: listing!.id,
          name: listing!.name,
          beds: listing!.beds,
          checkIn: checkIn.value,
          checkOut: checkOut.value,
          signature,
          renterPubkey: renter,
        });
      }
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
      <aside
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
      >
        <button
          class="modal__close"
          type="button"
          aria-label="Close"
          onClick={() => selectListing(null)}
        >
          ×
        </button>

        <p class="modal__eyebrow">Stay</p>
        <h2 id="booking-title" class="modal__title">{listing.name}</h2>
        <p class="modal__meta">
          {listing.beds} bed{listing.beds > 1 ? "s" : ""} · {priceLabel} flat
          {" "}
          (90% host · 10% platform)
        </p>
        {listing.description && (
          <p class="modal__hint">{listing.description}</p>
        )}

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

        {isOwner
          ? (
            <p class="modal__hint">
              This is your listing. You can't book your own stay — manage it
              from the dashboard.
            </p>
          )
          : !wallet
          ? (
            <p class="modal__hint">
              Connect a Devnet wallet to book this stay.
            </p>
          )
          : !hostPubkey
          ? (
            <p class="modal__hint">
              This listing has no host wallet on record — booking disabled.
            </p>
          )
          : null}

        {!isOwner && txStatus.value !== "done" && (
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
              : `Book for ${priceLabel}`}
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
