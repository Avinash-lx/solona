import { useConnection } from '@solana/wallet-adapter-react';
import { useQuery } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { config } from '../lib/config';
import { LISTING_DISCRIMINATOR, decodeListing } from '../lib/anchor/decoders';
import { bs58Encode } from '../lib/solana/encoding';
import { useDemoStore } from '../stores/demoStore';
import { queryKeys } from '../lib/queryClient';
import type { Listing } from '../types';

export interface ListingsResult {
  data: Listing[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Active listings. In demo mode they come from the live client-side demo store
 * (instant updates as you mint/list/buy); otherwise they're fetched from the
 * program's `Listing` accounts via getProgramAccounts (kept fresh by
 * useRealtimeSync — no polling).
 */
export function useListings(): ListingsResult {
  const { connection } = useConnection();
  // Subscribe to the demo store so demo mutations re-render the grid.
  const demoListings = useDemoStore((s) => s.listings);

  const query = useQuery<Listing[]>({
    queryKey: queryKeys.listings,
    enabled: !config.demoMode,
    queryFn: async () => {
      const accounts = await connection.getProgramAccounts(config.programId, {
        commitment: 'confirmed',
        filters: [{ memcmp: { offset: 0, bytes: bs58Encode(LISTING_DISCRIMINATOR) } }],
      });
      const listings: Listing[] = [];
      for (const { pubkey, account } of accounts) {
        try {
          listings.push(decodeListing(pubkey, account));
        } catch {
          // Skip accounts that don't decode (e.g. layout drift); never crash the grid.
        }
      }
      return listings;
    },
  });

  if (config.demoMode) {
    return { data: demoListings, isLoading: false, isError: false, error: null, refetch: () => {} };
  }
  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Find a single listing in the cached set by mint (cheap, no extra RPC). */
export function findListingByMint(listings: Listing[] | undefined, mint: string) {
  return listings?.find((l) => l.nftMint === mint) ?? null;
}

export function safePublicKey(value: string): PublicKey | null {
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}
