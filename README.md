🏖️ SolBnB

A decentralized, frictionless short-term rental platform built on Solana.

SolBnB is a Web3 reimagining of Airbnb. By leveraging the speed and low costs of the Solana blockchain, SolBnB allows users to seamlessly book real-world stays using their crypto wallet. Upon successful on-chain payment, users instantly unlock physical access codes and Wi-Fi credentials for their rental.

This project was built as a hackathon prototype.

✨ Features

Web3 Authentication: No passwords or emails required. Log in instantly using your Solana wallet (Phantom, Backpack, etc.).

Interactive Discovery: Browse available stays on a fully integrated OpenStreetMap centered on San Francisco.

Search & Filter: Easily find rentals by neighborhood name or area code.

Frictionless Booking: Select your dates via an intuitive calendar interface.

Crypto Payments: Book your stay with a single click using SOL (Devnet). For this demo, all bookings are uniformly priced at 0.000001 SOL.

Token-Gated Access: Wi-Fi passwords and 6-digit physical smart-lock door codes are securely revealed in the UI only after the Solana network confirms the transaction.

🛠️ Tech Stack

Frontend Framework: Fresh (Deno & Preact) for lightning-fast, edge-rendered pages.

Blockchain: Solana Devnet & @solana/web3.js.

Wallet Integration: Solana Wallet Adapter.

Maps: OpenStreetMap (via Leaflet).

🚀 Getting Started

Follow these instructions to run the SolBnB demo on your local machine.

Prerequisites

Install Deno.

Install a Solana Wallet browser extension (e.g., Phantom).

Ensure your wallet is switched to the Solana Devnet.

Fund your Devnet wallet with test SOL using the Solana Faucet.

Installation

Clone the repository:

git clone https://github.com/yourusername/solbnb.git
cd solbnb


Start the Fresh development server:

deno task start


Open your browser and navigate to http://localhost:8000.

🎮 How to Use the Demo

Click "Connect Wallet" in the top right corner and approve the connection.

Pan and zoom around the San Francisco map to view randomized mock rental listings.

Click on a map pin to view the property details.

Select your desired dates on the calendar popup.

Click "Book for 0.000001 SOL".

Approve the transaction in your wallet popup.

Wait a few seconds for network confirmation. Once verified, your unique Door Code and Wi-Fi Password will appear on screen!

🛣️ Roadmap (Post-Hackathon)

While this demo uses client-side mock data and direct wallet-to-wallet transfers to simulate the booking experience, future iterations will include:

A custom Solana Anchor Smart Contract (Program) to hold funds in escrow until the check-in date.

Decentralized storage (Arweave/IPFS) for host listing metadata and images.

A host dashboard for users to list their own properties.

📄 License

This project is licensed under the MIT License.
