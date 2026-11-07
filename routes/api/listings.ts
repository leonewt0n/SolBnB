import { define } from "../../utils.ts";
import {
  getDeletedListingIds,
  getHostListings,
} from "../../data/hostStore.ts";
import { fetchOnChainListings } from "../../lib/onchainListings.ts";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("RPC timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Wallet-created pins only (on-chain + local secrets store). No mock catalog. */
export const handler = define.handlers({
  async GET() {
    let onChain: Awaited<ReturnType<typeof fetchOnChainListings>> = [];
    try {
      onChain = await withTimeout(fetchOnChainListings(), 4000);
    } catch (err) {
      console.error("Failed to load on-chain listings", err);
    }

    const hosted = await getHostListings();
    const deleted = new Set(await getDeletedListingIds());
    const byId = new Map(hosted.map((l) => [l.id, l]));
    for (const l of onChain) {
      if (deleted.has(l.id)) continue;
      const prev = byId.get(l.id);
      byId.set(
        l.id,
        prev
          ? {
            ...prev,
            ...l,
            hostPubkey: l.hostPubkey ?? prev.hostPubkey,
            description: l.description ?? prev.description,
            beds: l.beds === 1 && prev.beds > 1 ? prev.beds : l.beds,
            priceLamports: l.priceLamports || prev.priceLamports,
          }
          : l,
      );
    }
    for (const id of deleted) byId.delete(id);

    return Response.json([...byId.values()]);
  },
});
