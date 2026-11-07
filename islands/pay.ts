import { DEVNET_RPC_DEFAULT, MIN_PRICE_LAMPORTS } from "../lib/constants.ts";

/** Subset of @solana/web3.js used by the booking flow (from CDN IIFE). */
type SolanaWeb3 = {
  Connection: new (
    endpoint: string,
    commitment?: string,
  ) => {
    getLatestBlockhash(
      commitment?: string,
    ): Promise<{ blockhash: string; lastValidBlockHeight: number }>;
    confirmTransaction(
      strategy: {
        signature: string;
        blockhash: string;
        lastValidBlockHeight: number;
      },
      commitment?: string,
    ): Promise<{ value: { err: unknown } }>;
  };
  PublicKey: {
    new (value: string | Uint8Array): {
      toString(): string;
      toBuffer(): Uint8Array;
    };
    findProgramAddressSync: (
      seeds: Uint8Array[],
      // deno-lint-ignore no-explicit-any
      programId: any,
      // deno-lint-ignore no-explicit-any
    ) => [any, number];
  };
  SystemProgram: {
    programId: unknown;
    transfer(params: {
      fromPubkey: unknown;
      toPubkey: unknown;
      lamports: number;
    }): unknown;
  };
  Transaction: new (opts: {
    feePayer: unknown;
    blockhash: string;
    lastValidBlockHeight: number;
  }) => {
    add(...items: unknown[]): unknown;
  };
  TransactionInstruction: new (opts: {
    keys: Array<{ pubkey: unknown; isSigner: boolean; isWritable: boolean }>;
    programId: unknown;
    data: Uint8Array;
  }) => unknown;
};

type SolanaProvider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect(opts?: {
    onlyIfTrusted?: boolean;
  }): Promise<{ publicKey: { toString(): string } }>;
  disconnect?: () => Promise<void>;
  // deno-lint-ignore no-explicit-any
  signAndSendTransaction(transaction: any): Promise<{ signature: string }>;
};

declare global {
  interface Window {
    solana?: SolanaProvider;
    backpack?: SolanaProvider;
    solanaWeb3?: SolanaWeb3;
  }
}

const WEB3_SCRIPT_ID = "solana-web3-cdn";
const WEB3_SCRIPT_SRC =
  "https://unpkg.com/@solana/web3.js@1.98.2/lib/index.iife.min.js";

export function loadWeb3(): Promise<SolanaWeb3> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Wallet APIs are browser-only."));
  }
  if (window.solanaWeb3) return Promise.resolve(window.solanaWeb3);

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(WEB3_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.solanaWeb3) resolve(window.solanaWeb3);
        else reject(new Error("Solana web3 failed to initialize."));
      }, { once: true });
      existing.addEventListener("error", () => {
        reject(new Error("Failed to load Solana web3.js CDN script."));
      }, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = WEB3_SCRIPT_ID;
    script.src = WEB3_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.solanaWeb3) resolve(window.solanaWeb3);
      else reject(new Error("Solana web3 failed to initialize."));
    };
    script.onerror = () => {
      reject(new Error("Failed to load Solana web3.js CDN script."));
    };
    document.head.appendChild(script);
  });
}

export function getWalletProvider(): SolanaProvider | null {
  if (typeof window === "undefined") return null;
  if (window.solana?.publicKey || window.solana?.isPhantom) {
    return window.solana;
  }
  if (window.backpack) return window.backpack;
  return window.solana ?? null;
}

/** Wait for Phantom/Backpack inject (often after first paint on a new page). */
export function waitForWalletProvider(
  timeoutMs = 2500,
): Promise<SolanaProvider | null> {
  const existing = getWalletProvider();
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const provider = getWalletProvider();
      if (provider) {
        resolve(provider);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(null);
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

export async function connectWallet(): Promise<string> {
  const provider = getWalletProvider();
  if (!provider) {
    throw new Error("No Solana wallet found. Install Phantom or Backpack.");
  }
  const res = await provider.connect();
  return res.publicKey.toString();
}

/**
 * Silent reconnect after navigation/refresh.
 * Uses onlyIfTrusted so Phantom does not pop a connect modal.
 */
export async function restoreWalletSession(): Promise<string | null> {
  const provider = await waitForWalletProvider();
  if (!provider) return null;

  if (provider.publicKey) {
    return provider.publicKey.toString();
  }

  try {
    const res = await provider.connect({ onlyIfTrusted: true });
    return res.publicKey.toString();
  } catch {
    return null;
  }
}

export async function disconnectWallet(): Promise<void> {
  const provider = getWalletProvider();
  try {
    await provider?.disconnect?.();
  } catch {
    // Some wallets throw if already disconnected — still clear local state.
  }
}

/** Pay the listing host the listing's on-chain price. */
export async function bookStay(
  hostPubkey: string,
  priceLamports: number,
): Promise<string> {
  const provider = getWalletProvider();
  if (!provider?.publicKey) {
    throw new Error("Connect your wallet first.");
  }
  if (!hostPubkey) {
    throw new Error("Listing host is unknown — cannot route payment.");
  }
  if (
    !Number.isFinite(priceLamports) ||
    priceLamports < MIN_PRICE_LAMPORTS
  ) {
    throw new Error("Listing price is invalid.");
  }

  const {
    Connection,
    PublicKey,
    SystemProgram,
    Transaction,
  } = await loadWeb3();

  const connection = new Connection(DEVNET_RPC_DEFAULT, "confirmed");
  const from = new PublicKey(provider.publicKey.toString());
  const to = new PublicKey(hostPubkey);

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
      lamports: Math.floor(priceLamports),
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
