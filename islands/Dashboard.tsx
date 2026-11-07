import { useEffect, useState } from "preact/hooks";
import { IS_BROWSER } from "fresh/runtime";
import type { PublicListing } from "../data/listings.public.ts";
import { DEFAULT_LISTING_PROGRAM_ID } from "../lib/constants.ts";
import {
  type BookingRecord,
  bookingsForWallet,
  hydrateHostListings,
  hydrateWalletAddress,
  listingsForHost,
  mergeHostListings,
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
    const wallet = walletAddress.value;
    setListed(wallet ? listingsForHost(wallet) : []);
    setRenting(wallet ? bookingsForWallet(wallet) : []);
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
                          {item.beds === 1 ? "bed" : "beds"}
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
                        <span class="dashboard__badge dashboard__badge--active">
                          active
                        </span>
                      </div>
                    </li>
                  ))}
              </ul>
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
