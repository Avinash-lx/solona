import { config } from '../../lib/config';

/**
 * ROADMAP STUB — Offers / bids.
 *
 * This UI is intentionally non-functional. Accepting/escrowing offers requires
 * a NEW on-chain instruction (e.g. `makeOffer` / `acceptOffer` with an escrow
 * PDA) that the current program does NOT expose. We render the planned UX
 * behind the `VITE_FEATURE_OFFERS` flag so it can be designed/reviewed, but we
 * never fake on-chain behavior. See the README "Roadmap" section.
 */
export function OffersPanel() {
  if (!config.features.offers) return null;

  return (
    <div className="card border-dashed p-5">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-bold">Make an offer</h3>
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
        <button type="button" className="btn-primary" disabled aria-disabled title="Not yet available">
          Submit offer
        </button>
      </div>
    </div>
  );
}
