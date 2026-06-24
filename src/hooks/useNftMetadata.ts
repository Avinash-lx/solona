import { useQueries, useQuery } from '@tanstack/react-query';
import { fetchNftMetadata } from '../lib/solana/metadata';
import { useDemoStore } from '../stores/demoStore';
import { config } from '../lib/config';
import { queryKeys } from '../lib/queryClient';
import type { NftMetadata } from '../types';

/** Resolve metadata, short-circuiting to live demo data in demo mode. */
function resolveMetadata(mint: string, signal?: AbortSignal): Promise<NftMetadata | null> {
  if (config.demoMode) {
    const demo = useDemoStore.getState().getMetadata(mint);
    return Promise.resolve(demo);
  }
  return fetchNftMetadata(mint, signal);
}

/** Resolve metadata for a single mint (cached aggressively — metadata is immutable). */
export function useNftMetadata(mint: string | null | undefined) {
  return useQuery<NftMetadata | null>({
    queryKey: queryKeys.metadata(mint ?? ''),
    enabled: Boolean(mint),
    staleTime: 60 * 60_000, // 1h: off-chain metadata rarely changes
    queryFn: ({ signal }) => resolveMetadata(mint!, signal),
  });
}

/**
 * Resolve metadata for many mints in parallel, each independently cached. Used
 * by the browse grid and portfolio so re-renders never refetch resolved items.
 */
export function useNftMetadataBatch(mints: string[]) {
  const results = useQueries({
    queries: mints.map((mint) => ({
      queryKey: queryKeys.metadata(mint),
      queryFn: ({ signal }: { signal: AbortSignal }) => resolveMetadata(mint, signal),
      staleTime: 60 * 60_000,
    })),
  });

  const map: Record<string, NftMetadata | null> = {};
  mints.forEach((mint, i) => {
    map[mint] = results[i]?.data ?? null;
  });

  return {
    metadataByMint: map,
    isLoading: results.some((r) => r.isLoading),
  };
}
