import { accountOpen, walletAddress } from "./store.ts";

export default function AccountModal() {
  if (!accountOpen.value) return null;

  const address = walletAddress.value;

  return (
    <div
      class="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) accountOpen.value = false;
      }}
    >
      <aside
        class="modal modal--account"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-title"
      >
        <button
          class="modal__close"
          type="button"
          aria-label="Close"
          onClick={() => {
            accountOpen.value = false;
          }}
        >
          ×
        </button>

        <p class="modal__eyebrow">Wallet</p>
        <h2 id="account-title" class="modal__title">Account</h2>
        <p class="modal__meta">Connected on Solana Devnet</p>

        {address
          ? (
            <>
              <div class="account-box">
                <span class="account-box__label">Address</span>
                <code class="account-box__value">{address}</code>
              </div>
              <div class="account-actions">
                <button
                  type="button"
                  class="cta cta--secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(address);
                    } catch {
                      // ignore
                    }
                  }}
                >
                  Copy address
                </button>
                <a
                  class="access__link"
                  href={`https://explorer.solana.com/address/${address}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on Solana Explorer
                </a>
              </div>
            </>
          )
          : <p class="modal__hint">No wallet connected.</p>}
      </aside>
    </div>
  );
}
