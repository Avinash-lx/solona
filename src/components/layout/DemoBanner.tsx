import { config } from '../../lib/config';

/** Honest indicator that the data on screen is seeded demo data, not on-chain. */
export function DemoBanner() {
  if (!config.demoMode) return null;
  return (
    <div className="bg-gradient-to-r from-brand-500 to-accent px-4 py-1.5 text-center text-xs font-semibold text-white">
      🎬 Demo mode — showing seeded sample data (no wallet or on-chain state required). Set{' '}
      <code className="rounded bg-black/20 px-1">VITE_DEMO_MODE=false</code> for live Devnet.
    </div>
  );
}
