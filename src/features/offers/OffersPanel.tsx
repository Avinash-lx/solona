import { config } from '../../lib/config';
import type { Listing } from '../../types';

/**
 * ROADMAP STUB — Offers / bids.
 *
 * Accepting escrowed offers requires a NEW on-chain instruction
 * (`make_offer` / `accept_offer` with an offer-escrow PDA) that the current
 * program does not expose. We render the planned UX behind the
 * `VITE_FEATURE_OFFERS` flag (off by default) but never fake on-chain behavior.
 */
export function OffersPanel(_props: { mint: string; listing: Listing | null }) {
  if (!config.features.offers) return null;

  return (
    <div className="card border-dashed p-5">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-bold">Offers</h3>
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-500 ring-1 ring-inset ring-amber-500/30">
          Roadmap
        </span>
      </div>
      <p className="mb-3 text-xs text-zinc-500">
        Offers require a new on-chain instruction (escrowed bids) that isn't deployed yet. This is a
        non-functional preview — no transaction will be sent.
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
