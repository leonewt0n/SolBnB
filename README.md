# SolBnB

[![Free image uploader - myimgs.org](https://myimgs.org/storage/images/79208/Screenshot2026-11-06at15319PM.png)](https://myimgs.org/)

A decentralized short-term rental demo on **Solana Devnet**. Connect a wallet,
browse mock San Francisco stays on OpenStreetMap, pay **0.001 SOL**, and unlock
a door code + Wi-Fi password after on-chain confirmation.

Built with **Fresh (Deno + Preact)**, **Leaflet / OSM**, and
**@solana/web3.js**.

## Prerequisites

- [Deno](https://deno.land/) 2.x
- Phantom or Backpack browser wallet switched to
  [**Devnet**](https://docs.phantom.com/developer-powertools/testnet-mode)
- Devnet SOL from the [Solana faucet](https://faucet.solana.com/)

## Setup

```bash
cp .env.example .env
# Set MERCHANT_WALLET to YOUR Devnet pubkey so you receive the demo payments
deno task dev
```

Open http://localhost:8000 (or the URL printed in the terminal).

> Tip: put your Phantom Devnet address in `MERCHANT_WALLET` so the `0.001 SOL`
> bookings land in a wallet you control.

## Demo flow

1. Click **Connect Wallet** (Phantom/Backpack on Devnet).
2. Search pans the map (no mock pins). Click a wallet-created pin to book.
3. Choose check-in / check-out dates.
4. Pay **0.001 SOL** and approve the wallet popup.
5. After confirmation, the UI reveals the **door code** and **Wi-Fi password**.

### Host a stay

1. Connect wallet → **List**.
2. Click the map to drop an exact GPS pin.
3. Enter title, door passkey, and Wi-Fi password.
4. Approve the wallet popup — GPS + name land in a Devnet **Listing** PDA
   (`LISTING_PROGRAM_ID`). Door / Wi-Fi stay server-side and unlock through
   `POST /api/unlock` after payment. Refresh reloads pins via
   `getProgramAccounts`.

Door/Wi-Fi secrets are stored server-side and only returned from
`POST /api/unlock` after the Devnet transfer is verified.

## Scripts

| Task             | Command           |
| ---------------- | ----------------- |
| Dev server       | `deno task dev`   |
| Production build | `deno task build` |
| Start build      | `deno task start` |
| Lint / check     | `deno task check` |

## Project layout

```
components/          # (optional) static Preact components
data/                # public listings + server-only secrets
islands/             # Wallet, Map, Booking, AppShell
lib/                 # Solana connection + payment verification
routes/              # pages + /api/listings + /api/unlock
```

## Notes

- Every listing costs exactly `1_000_000` lamports (`0.001 SOL`) on Devnet —
  enough to create the merchant account if needed.
- This is a hackathon prototype: no escrow program, no real locks.
- Never import `data/listings.secrets.ts` from islands.

## License

MIT
