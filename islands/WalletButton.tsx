import { useEffect } from "preact/hooks";
import { IS_BROWSER } from "fresh/runtime";
import {
  connectWallet,
  disconnectWallet,
  getWalletProvider,
  restoreWalletSession,
} from "./pay.ts";
import {
  hydrateWalletAddress,
  logoutWallet,
  setWalletAddress,
  walletAddress,
  walletMenuOpen,
} from "./store.ts";

const PHANTOM_STORE_URL =
  "https://chromewebstore.google.com/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa";

function shorten(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export default function WalletButton() {
  useEffect(() => {
    if (!IS_BROWSER) return;

    // Survive Fresh full-page navigations (signals reset each load).
    hydrateWalletAddress();

    let cancelled = false;
    (async () => {
      const addr = await restoreWalletSession();
      if (cancelled) return;
      if (addr) setWalletAddress(addr);
      else setWalletAddress(null);
    })();

    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(".wallet-menu")) {
        walletMenuOpen.value = false;
      }
    }
    document.addEventListener("click", onDocClick);
    return () => {
      cancelled = true;
      document.removeEventListener("click", onDocClick);
    };
  }, []);

  async function onConnect() {
    try {
      const addr = await connectWallet();
      setWalletAddress(addr);
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
            <a
              class="wallet-menu__item"
              role="menuitem"
              href="/dashboard"
              onClick={() => {
                walletMenuOpen.value = false;
              }}
            >
              Account
            </a>
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

  if (!hasWallet) {
    return (
      <a
        class="wallet-btn"
        href={PHANTOM_STORE_URL}
        target="_blank"
        rel="noreferrer"
        title="Install Phantom from the Chrome Web Store"
      >
        Install Wallet
      </a>
    );
  }

  return (
    <button
      class="wallet-btn"
      type="button"
      onClick={onConnect}
      title="Connect Phantom or Backpack"
    >
      Connect Wallet
    </button>
  );
}
