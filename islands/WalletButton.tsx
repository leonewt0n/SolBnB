import { IS_BROWSER } from "fresh/runtime";
import { connectWallet, getWalletProvider } from "./pay.ts";
import { walletAddress } from "./store.ts";

function shorten(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export default function WalletButton() {
  async function onConnect() {
    try {
      const addr = await connectWallet();
      walletAddress.value = addr;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Wallet connection failed");
    }
  }

  if (!IS_BROWSER) {
    return (
      <button class="wallet-btn" type="button" disabled>
        Connect Wallet
      </button>
    );
  }

  const connected = walletAddress.value;
  const hasWallet = !!getWalletProvider();

  if (connected) {
    return (
      <button class="wallet-btn wallet-btn--connected" type="button" title={connected}>
        {shorten(connected)}
      </button>
    );
  }

  return (
    <button
      class="wallet-btn"
      type="button"
      onClick={onConnect}
      disabled={!hasWallet}
      title={hasWallet ? "Connect Phantom or Backpack" : "Install Phantom or Backpack"}
    >
      {hasWallet ? "Connect Wallet" : "Install Wallet"}
    </button>
  );
}
