import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useOffersStore } from '../../stores/offersStore';
import { DEMO_WALLET } from '../../lib/demo/demoData';
import { config } from '../../lib/config';
import { formatSol, shortenAddress } from '../../lib/utils';
import type { Listing } from '../../types';

/**
 * Offers / bids.
 *
 * - **Demo mode**: fully interactive — make an offer on any NFT, and accept or
 *   decline incoming offers on your own listings.
 * - **Live mode**: gated behind `VITE_FEATURE_OFFERS` and shown as a clearly
 *   marked, non-functional preview, because accepting escrowed offers needs a
 *   NEW on-chain instruction the current program doesn't expose. We never fake
 *   on-chain behavior. See the README roadmap.
 */
export function OffersPanel({ mint, listing }: { mint: string; listing: Listing | null }) {
  const { publicKey } = useWallet();
  const offers = useOffersStore((s) => s.offers.filter((o) => o.mint === mint));
  const makeOffer = useOffersStore((s) => s.makeOffer);
  const acceptOffer = useOffersStore((s) => s.acceptOffer);
  const cancelOffer = useOffersStore((s) => s.cancelOffer);
  const [amount, setAmount] = useState('');

  if (!config.demoMode && !config.features.offers) return null;

  // In demo the "current user" is DEMO_WALLET; in live it's the connected wallet.
  const me = config.demoMode ? DEMO_WALLET : publicKey?.toBase58();
  const isOwnListing = Boolean(listing && me && listing.seller === me);
  const sorted = [...offers].sort((a, b) => b.priceSol - a.priceSol);

  // Live (non-demo) preview — no on-chain backing yet.
  if (!config.demoMode) {
    return (
      <div className="card border-dashed p-5">
        <PanelHeader />
        <p className="mb-3 text-xs text-zinc-500">
          Offers require a new on-chain instruction (escrowed bids) that isn't deployed yet. This is
          a non-functional preview — no transaction will be sent.
        </p>
        <div className="flex gap-2 opacity-60">
          <input className="input max-w-[8rem]" placeholder="Offer (SOL)" disabled aria-disabled />
          <button type="button" className="btn-primary" disabled aria-disabled>
            Submit offer
          </button>
        </div>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (Number.isFinite(n) && n > 0) {
      makeOffer(mint, Math.round(n * 100) / 100);
      setAmount('');
    }
  };

  return (
    <div className="card p-5">
      <PanelHeader />

      {!isOwnListing && (
        <form className="mb-4 flex gap-2" onSubmit={submit}>
          <input
            type="number"
            min={0}
            step="0.1"
            className="input max-w-[10rem]"
            placeholder="Offer (SOL)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label="Offer amount in SOL"
          />
          <button type="submit" className="btn-primary">
            Make offer
          </button>
        </form>
      )}

      {sorted.length === 0 ? (
        <p className="py-4 text-center text-xs text-zinc-400">
          No offers yet{isOwnListing ? ' — you’ll see incoming bids here.' : ' — be the first to bid.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((o) => {
            const mine = o.bidder === me;
            return (
              <li
                key={o.id}
                className="flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  <span className="font-bold tabular-nums text-brand-400">{formatSol(o.priceSol)} SOL</span>
                  <span className="text-xs text-zinc-400">
                    {mine ? 'your bid' : `by ${shortenAddress(o.bidder)}`}
                  </span>
                </span>
                {isOwnListing ? (
                  <button type="button" className="btn-primary px-3 py-1 text-xs" onClick={() => acceptOffer(o.id)}>
                    Accept
                  </button>
                ) : mine ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-500 hover:underline"
                    onClick={() => cancelOffer(o.id)}
                  >
                    Cancel
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PanelHeader() {
  return (
    <div className="mb-2 flex items-center gap-2">
      <h3 className="text-sm font-bold">Offers</h3>
      {!config.demoMode && (
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-500 ring-1 ring-inset ring-amber-500/30">
          Roadmap
        </span>
      )}
    </div>
  );
}
