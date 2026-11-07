import { useEffect } from "preact/hooks";
import { IS_BROWSER } from "fresh/runtime";
import { connectWallet, disconnectWallet, getWalletProvider } from "./pay.ts";
import {
  logoutWallet,
  openAccount,
  walletAddress,
  walletMenuOpen,
} from "./store.ts";

function shorten(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export default function WalletButton() {
  useEffect(() => {
    if (!IS_BROWSER) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(".wallet-menu")) {
        walletMenuOpen.value = false;
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  async function onConnect() {
    try {
      const addr = await connectWallet();
      walletAddress.value = addr;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Wallet connection failed");
    }
  }

  async function onLogout() {
    await disconnectWallet();
    logoutWallet();
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
  const menuOpen = walletMenuOpen.value;

  if (connected) {
    return (
      <div class="wallet-menu">
        <button
          class="wallet-btn wallet-btn--connected"
          type="button"
          title={connected}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={(e) => {
            e.stopPropagation();
            walletMenuOpen.value = !walletMenuOpen.value;
          }}
        >
          {shorten(connected)}
        </button>
        {menuOpen && (
          <div class="wallet-menu__panel" role="menu">
            <button
              type="button"
              class="wallet-menu__item"
              role="menuitem"
              onClick={openAccount}
            >
              Account
            </button>
            <button
              type="button"
              class="wallet-menu__item wallet-menu__item--danger"
              role="menuitem"
              onClick={onLogout}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      class="wallet-btn"
      type="button"
      onClick={onConnect}
      disabled={!hasWallet}
      title={hasWallet
        ? "Connect Phantom or Backpack"
        : "Install Phantom or Backpack"}
    >
      {hasWallet ? "Connect Wallet" : "Install Wallet"}
    </button>
  );
}
