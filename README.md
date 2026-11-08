# SolBnB

[![Free image uploader - myimgs.org](https://myimgs.org/storage/images/79208/Screenshot2026-11-06at15319PM.png)](https://myimgs.org/)

**Your Home On Solana.** A decentralized short-term rental demo on **Solana
Devnet**. Hosts pin stays on an OpenStreetMap map, publish them as on-chain
**Listing** PDAs, and set their own price. Guests connect a wallet, book with
SOL (min **0.001 SOL**), and unlock a **door code** + **Wi-Fi password** after
payment is verified on-chain.

Built with **Fresh (Deno + Preact)**, **Leaflet / OSM**, **@solana/web3.js**,
and an **Anchor** listing program under `programs/solbnb`.

## Prerequisites

- [Deno](https://deno.land/) 2.x
- Phantom or Backpack browser wallet switched to
  [**Devnet**](https://docs.phantom.com/developer-powertools/testnet-mode)
- Devnet SOL from the [Solana faucet](https://faucet.solana.com/)
  (guests need SOL to book; hosts also need rent for the Listing account)

## Setup

```bash
cp .env.example .env
# MERCHANT_WALLET receives the 10% platform fee — use YOUR Devnet pubkey
deno install
deno task dev
```

Open http://localhost:8000 (or the URL printed in the terminal).

| Variable             | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `MERCHANT_WALLET`    | Platform fee receive pubkey (public key only)        |
| `RPC_URL`            | Optional; defaults to public Devnet                  |
| `LISTING_PROGRAM_ID` | Anchor listing program (Devnet default in `.env.example`) |

## Demo flow

### Book a stay

1. Click **Connect Wallet** (Phantom/Backpack on Devnet).
2. Search pans the map (USA places via `/api/geocode`) — it does not invent pins.
3. Click a host-created pin → pick check-in / check-out dates.
4. Pay the host’s listed price (minimum **0.001 SOL**). The wallet sends
   **90% to the host** and **10% to `MERCHANT_WALLET`**.
5. After confirmation, `POST /api/unlock` reveals the **Door code** and
   **Wi-Fi**. Bookings are remembered in the browser for the dashboard.

Hosts cannot book their own listing — manage it from the dashboard instead.

### List a stay

1. Connect wallet → **List** → click the map to drop a GPS pin
   (or **Cancel pin**).
2. Enter title, description, price (SOL), beds, door passkey, and Wi-Fi password.
3. Approve **Sign & publish on-chain** — public fields land in a Devnet
   **Listing** PDA (`LISTING_PROGRAM_ID`); door / Wi-Fi stay server-side.
4. Refresh reloads pins via `GET /api/listings` (`getProgramAccounts`).

### Host dashboard

Open **Account** from the wallet menu (or visit `/dashboard`):

- **Properties Listed** — edit price/details/secrets, or delete (closes the PDA
  and clears server secrets).
- **Properties Renting** — stays you’ve booked, with Explorer tx links.

## How it works

| Layer        | Behavior |
| ------------ | -------- |
| On-chain     | Listing PDA: host, name, lat/lng, price, secrets commitment, nonce |
| Payments     | Direct SOL transfers (no escrow); 90% host / 10% platform          |
| Server       | Door / Wi-Fi in the host store; returned only after payment verify |
| Client       | Map + modals; listings refresh from `/api/listings` after load     |

Never import `data/listings.secrets.ts` or the host store from islands.

## Scripts

| Task             | Command           |
| ---------------- | ----------------- |
| Dev server       | `deno task dev`   |
| Production build | `deno task build` |
| Start build      | `deno task start` |
| Lint / check     | `deno task check` |

## Project layout

```
data/                # public listing types + server host store / secrets
islands/             # AppShell, map, booking, list/edit, dashboard, wallet
lib/                 # constants, Solana RPC, on-chain decode, payment verify
programs/solbnb/     # Anchor Listing program (Devnet)
routes/              # / , /dashboard , /api/{listings,unlock,host-secrets,geocode}
static/              # styles + assets
```

## Notes

- Minimum booking price is `1_000_000` lamports (`0.001 SOL`); hosts set the
  actual price on-chain.
- Platform fee is `1000` bps (10%) via `PLATFORM_FEE_BPS`.
- Hackathon prototype: no escrow program, no real locks, dates are UI-only.
- Default Devnet program id:
  `FkYg3CaWUoN3Af6BU486X2rLpg4b3ra8gKBPiztd2WJd`.

## License

MIT
