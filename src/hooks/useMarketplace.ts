import { useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { findMarketplacePda } from '../lib/anchor/pdas';
import { decodeMarketplace } from '../lib/anchor/decoders';
import { subscribeAccount, removeSubscription } from '../lib/solana/subscriptions';
import { queryKeys } from '../lib/queryClient';
import { config } from '../lib/config';
import type { Marketplace } from '../types';

/**
 * Fetches the marketplace config account and keeps it live via an
 * onAccountChange subscription (fee updates, listing counter). Returns
 * `null` data (not an error) when the marketplace hasn't been initialized yet.
 */
export function useMarketplace() {
  const { connection } = useConnection();
  const queryClient = useQueryClient();
  const [marketplacePda] = findMarketplacePda(config.marketplaceName);

  const query = useQuery<Marketplace | null>({
    queryKey: queryKeys.marketplace,
    enabled: !config.demoMode,
    queryFn: async () => {
      const info = await connection.getAccountInfo(marketplacePda, 'confirmed');
      if (!info) return null;
      return decodeMarketplace(marketplacePda, info);
    },
  });

  useEffect(() => {
    if (config.demoMode) return;
    const id = subscribeAccount(connection, marketplacePda, (info) => {
      if (!info) {
        queryClient.setQueryData(queryKeys.marketplace, null);
        return;
      }
      try {
        queryClient.setQueryData(
          queryKeys.marketplace,
          decodeMarketplace(marketplacePda, info),
        );
      } catch {
        queryClient.invalidateQueries({ queryKey: queryKeys.marketplace });
      }
    });
    return () => removeSubscription(connection, id);
  }, [connection, marketplacePda, queryClient]);

  if (config.demoMode) {
    const demoMarketplace: Marketplace = {
      address: marketplacePda.toBase58(),
      authority: '11111111111111111111111111111111',
      treasury: '11111111111111111111111111111111',
      feeBps: 200,
      name: config.marketplaceName,
      listingsCount: 0,
    };
    return { ...query, data: demoMarketplace } as typeof query;
  }

  return query;
}
