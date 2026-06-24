import { PublicKey } from '@solana/web3.js';
import type { Cluster } from '@solana/web3.js';

/** Centralized, validated runtime config sourced from Vite env vars. */

function required(value: string | undefined, name: string): string {
  if (!value || value.trim() === '') {
    throw new Error(`Missing required env var ${name}. See .env.example.`);
  }
  return value;
}

const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://api.devnet.solana.com';

/** Derive a ws:// endpoint from the http(s) RPC if none is provided. */
function deriveWsUrl(http: string): string {
  return http.replace(/^http/, 'ws');
}

export const config = {
  rpcUrl: RPC_URL,
  rpcWsUrl: import.meta.env.VITE_RPC_WS_URL || deriveWsUrl(RPC_URL),
  programId: new PublicKey(
    required(import.meta.env.VITE_PROGRAM_ID, 'VITE_PROGRAM_ID'),
  ),
  network: (import.meta.env.VITE_NETWORK || 'devnet') as Cluster,
  marketplaceName: import.meta.env.VITE_MARKETPLACE_NAME || 'devnet-marketplace',
  features: {
    offers: import.meta.env.VITE_FEATURE_OFFERS === 'true',
  },
} as const;

export const LAMPORTS_PER_SOL = 1_000_000_000;
export const MAX_FEE_BPS = 10_000;

/** Build a Solana Explorer URL for the configured cluster. */
export function explorerUrl(
  signatureOrAddress: string,
  kind: 'tx' | 'address' = 'tx',
): string {
  const base = `https://explorer.solana.com/${kind}/${signatureOrAddress}`;
  return `${base}?cluster=${config.network}`;
}
