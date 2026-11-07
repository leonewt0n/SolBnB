import { useEffect, useState } from "preact/hooks";
import { IS_BROWSER } from "fresh/runtime";
import type { PublicListing } from "../data/listings.public.ts";
import {
  DEFAULT_LISTING_PROGRAM_ID,
  lamportsToSolLabel,
  MIN_PRICE_LAMPORTS,
  PRICE_LAMPORTS,
  solToLamports,
} from "../lib/constants.ts";
import { closeListingOnChain } from "./deleteListing.ts";
import { updateListingPriceOnChain } from "./updateListingPrice.ts";
import {
  type BookingRecord,
  bookingsForWallet,
  hydrateHostListings,
  hydrateWalletAddress,
  listingsForHost,
  mergeHostListings,
  removeHostListing,
  updateHostListingPrice,
  walletAddress,
} from "./store.ts";
import WalletButton from "./WalletButton.tsx";

type Tab = "listed" | "renting";

type Props = {
  listingProgramId?: string;
};

function explorerAddressUrl(pubkey: string) {
  return `https://explorer.solana.com/address/${pubkey}?cluster=devnet`;
}

export default function Dashboard(
  { listingProgramId = DEFAULT_LISTING_PROGRAM_ID }: Props,
) {
  const [tab, setTab] = useState<Tab>("listed");
  const [listed, setListed] = useState<PublicListing[]>([]);
  const [renting, setRenting] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pricingId, setPricingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function refreshOwned() {
    const wallet = walletAddress.value;
    setListed(wallet ? listingsForHost(wallet) : []);
    setRenting(wallet ? bookingsForWallet(wallet) : []);
  }

  async function onUpdatePrice(item: PublicListing) {
    const wallet = walletAddress.value;
    if (!wallet) {
      setActionError("Connect your wallet first.");
      return;
    }
    if (item.hostPubkey && item.hostPubkey !== wallet) {
      setActionError("Only the listing host can change the price.");
      return;
    }
    if (!listingProgramId) {
      setActionError("Listing program is not configured.");
      return;
    }

    const currentSol = (item.priceLamports || PRICE_LAMPORTS) / 1_000_000_000;
    const raw = globalThis.prompt(
      `New price in SOL (min 0.001) for "${item.name}"`,
      String(currentSol),
    );
    if (raw == null) return;
    const priceLamports = solToLamports(Number(raw));
    if (
      !Number.isFinite(priceLamports) ||
      priceLamports < MIN_PRICE_LAMPORTS
    ) {
      setActionError("Price must be at least 0.001 SOL.");
      return;
    }

    setActionError(null);
    setPricingId(item.id);
    try {
      await updateListingPriceOnChain({
        programId: listingProgramId,
        listingPda: item.id,
        priceLamports,
      });

      const res = await fetch("/api/host-secrets", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          listingId: item.id,
          hostPubkey: wallet,
          priceLamports,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to mirror price off-chain");
      }

      updateHostListingPrice(item.id, priceLamports);
      refreshOwned();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not update price",
      );
    } finally {
      setPricingId(null);
    }
  }

  async function onDeleteListing(item: PublicListing) {
    const wallet = walletAddress.value;
    if (!wallet) {
      setActionError("Connect your wallet first.");
      return;
    }
    if (item.hostPubkey && item.hostPubkey !== wallet) {
      setActionError("Only the listing host can delete this stay.");
      return;
    }
    if (!listingProgramId) {
      setActionError("Listing program is not configured.");
      return;
    }
    if (
      !globalThis.confirm(
        `Delete "${item.name}"? Removes it from SolBnB and clears door / Wi-Fi secrets.`,
      )
    ) {
      return;
    }

    setActionError(null);
    setDeletingId(item.id);
    try {
      let chainNote: string | null = null;
      try {
        await closeListingOnChain({
          programId: listingProgramId,
          listingPda: item.id,
        });
      } catch (err) {
        // Tombstone still hides the pin if close fails (e.g. pre-price accounts).
        chainNote = err instanceof Error
          ? err.message
          : "On-chain close failed";
      }

      const res = await fetch("/api/host-secrets", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          listingId: item.id,
          hostPubkey: wallet,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to clear off-chain secrets");
      }

      removeHostListing(item.id);
      refreshOwned();
      if (chainNote) {
        setActionError(
          `Removed from SolBnB. On-chain close skipped: ${chainNote}`,
        );
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not delete listing",
      );
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    if (!IS_BROWSER) return;

    hydrateWalletAddress();
    hydrateHostListings([]);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/listings");
        if (res.ok) {
          const body = await res.json();
          if (!cancelled && Array.isArray(body)) {
            mergeHostListings(body as PublicListing[]);
          }
        }
      } catch (err) {
        console.error("Failed to load listings for dashboard", err);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    refreshOwned();
  }, [walletAddress.value, loading]);

  const address = walletAddress.value;

  return (
    <div class="app dashboard">
      <header class="topbar">
        <div class="topbar__brand">
          <a class="topbar__mark topbar__mark--link" href="/">SolBnB</a>
          <span class="topbar__tag">Dashboard</span>
        </div>
        <div class="topbar__tools">
          <WalletButton />
        </div>
      </header>

      <main class="dashboard__main">
        <section class="dashboard__activity" aria-label="Activity">
          <div class="dashboard__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              id="tab-listed"
              class={`dashboard__tab${
                tab === "listed" ? " dashboard__tab--active" : ""
              }`}
              aria-selected={tab === "listed"}
              aria-controls="panel-listed"
              onClick={() => setTab("listed")}
            >
              Properties Listed
              {!loading && address
                ? <span class="dashboard__tab-count">{listed.length}</span>
                : null}
            </button>
            <button
              type="button"
              role="tab"
              id="tab-renting"
              class={`dashboard__tab${
                tab === "renting" ? " dashboard__tab--active" : ""
              }`}
              aria-selected={tab === "renting"}
              aria-controls="panel-renting"
              onClick={() => setTab("renting")}
            >
              Properties Renting
              {!loading && address
                ? <span class="dashboard__tab-count">{renting.length}</span>
                : null}
            </button>
          </div>

          {loading
            ? <p class="dashboard__hint">Loading your stays…</p>
            : !address
            ? (
              <p class="dashboard__hint">
                Connect your wallet to see listings and bookings tied to it.
              </p>
            )
            : tab === "listed"
            ? (
              <>
                {actionError && (
                  <p class="dashboard__error" role="alert">{actionError}</p>
                )}
                <ul
                  class="dashboard__list"
                  role="tabpanel"
                  id="panel-listed"
                  aria-labelledby="tab-listed"
                >
                  {listed.length === 0
                    ? (
                      <li class="dashboard__row">
                        <p class="dashboard__row-meta">
                          No stays hosted by this wallet yet. List one from the
                          map.
                        </p>
                      </li>
                    )
                    : listed.map((item) => (
                      <li key={item.id} class="dashboard__row">
                        <div>
                          <p class="dashboard__row-name">{item.name}</p>
                          <p class="dashboard__row-meta">
                            {item.neighborhood} · {item.beds}{" "}
                            {item.beds === 1 ? "bed" : "beds"} ·{" "}
                            {lamportsToSolLabel(
                              item.priceLamports || PRICE_LAMPORTS,
                            )}
                          </p>
                        </div>
                        <div class="dashboard__row-actions">
                          <a
                            class="dashboard__chain-link"
                            href={explorerAddressUrl(item.id)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Listing
                          </a>
                          <button
                            type="button"
                            class="dashboard__price"
                            disabled={pricingId === item.id ||
                              deletingId === item.id}
                            onClick={() => onUpdatePrice(item)}
                          >
                            {pricingId === item.id
                              ? "Updating…"
                              : "Set price"}
                          </button>
                          <button
                            type="button"
                            class="dashboard__delete"
                            disabled={deletingId === item.id ||
                              pricingId === item.id}
                            onClick={() => onDeleteListing(item)}
                          >
                            {deletingId === item.id ? "Deleting…" : "Delete"}
                          </button>
                          <span class="dashboard__badge dashboard__badge--active">
                            active
                          </span>
                        </div>
                      </li>
                    ))}
                </ul>
              </>
            )
            : (
              <ul
                class="dashboard__list"
                role="tabpanel"
                id="panel-renting"
                aria-labelledby="tab-renting"
              >
                {renting.length === 0
                  ? (
                    <li class="dashboard__row">
                      <p class="dashboard__row-meta">
                        No bookings for this wallet yet. Book a stay from the
                        map.
                      </p>
                    </li>
                  )
                  : renting.map((item) => (
                    <li key={item.id} class="dashboard__row">
                      <div>
                        <p class="dashboard__row-name">{item.name}</p>
                        <p class="dashboard__row-meta">
                          {item.neighborhood} · {item.beds}{" "}
                          {item.beds === 1 ? "bed" : "beds"}
                        </p>
                      </div>
                      <div class="dashboard__row-actions">
                        <a
                          class="dashboard__chain-link"
                          href={`https://explorer.solana.com/tx/${item.signature}?cluster=devnet`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Tx
                        </a>
                        <p class="dashboard__dates">
                          {item.checkIn} → {item.checkOut}
                        </p>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
        </section>

        <section class="dashboard__account" aria-labelledby="dash-account">
          <p class="dashboard__eyebrow">Account</p>
          <h1 id="dash-account" class="dashboard__title">Your wallet</h1>
          <p class="dashboard__meta">Connected on Solana Devnet</p>

          {address
            ? (
              <>
                <div class="account-box">
                  <span class="account-box__label">Address</span>
                  <code class="account-box__value">{address}</code>
                </div>
                <div class="dashboard__links">
                  <a
                    class="dashboard__chain-link"
                    href={explorerAddressUrl(address)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View wallet on Explorer
                  </a>
                  {listingProgramId
                    ? (
                      <a
                        class="dashboard__chain-link"
                        href={explorerAddressUrl(listingProgramId)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View SolBnB program on Explorer
                      </a>
                    )
                    : null}
                </div>
              </>
            )
            : (
              <p class="dashboard__hint">
                Connect a wallet from the header to see your account.
              </p>
            )}
        </section>
      </main>
    </div>
  );
}
