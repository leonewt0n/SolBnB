import {
  DEVNET_RPC_DEFAULT,
  PRICE_LAMPORTS,
} from "../lib/constants.ts";

type SolanaWeb3 = typeof import("@solana/web3.js");

type SolanaProvider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect(): Promise<{ publicKey: { toString(): string } }>;
  // deno-lint-ignore no-explicit-any
  signAndSendTransaction(transaction: any): Promise<{ signature: string }>;
};

declare global {
  interface Window {
    solana?: SolanaProvider;
    backpack?: SolanaProvider;
  }
}

/** Load web3 from a browser CDN so Fresh islands don't ship Node bare specifiers. */
async function loadWeb3(): Promise<SolanaWeb3> {
  const mod = await import(
    // @ts-expect-error remote ESM for browser islands
    "https://esm.sh/@solana/web3.js@1.98.2"
  );
  return (mod.default ?? mod) as SolanaWeb3;
}

export function getWalletProvider(): SolanaProvider | null {
  if (typeof window === "undefined") return null;
  if (window.solana?.publicKey || window.solana?.isPhantom) {
    return window.solana;
  }
  if (window.backpack) return window.backpack;
  return window.solana ?? null;
}

export async function connectWallet(): Promise<string> {
  const provider = getWalletProvider();
  if (!provider) {
    throw new Error("No Solana wallet found. Install Phantom or Backpack.");
  }
  const res = await provider.connect();
  return res.publicKey.toString();
}

export async function bookStay(merchantPubkey: string): Promise<string> {
  const provider = getWalletProvider();
  if (!provider?.publicKey) {
    throw new Error("Connect your wallet first.");
  }

  const {
    Connection,
    PublicKey,
    SystemProgram,
    Transaction,
  } = await loadWeb3();

  const connection = new Connection(DEVNET_RPC_DEFAULT, "confirmed");
  const from = new PublicKey(provider.publicKey.toString());
  const to = new PublicKey(merchantPubkey);

  const { blockhash, lastValidBlockHeight } = await connection
    .getLatestBlockhash("confirmed");

  const tx = new Transaction({
    feePayer: from,
    blockhash,
    lastValidBlockHeight,
  }).add(
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: to,
      lamports: PRICE_LAMPORTS,
    }),
  );

  const { signature } = await provider.signAndSendTransaction(tx);

  const confirmation = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );

  if (confirmation.value.err) {
    throw new Error("Transaction failed on-chain.");
  }

  return signature;
}
