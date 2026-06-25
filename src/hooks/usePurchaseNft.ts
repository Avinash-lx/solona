import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { useMarketplaceClient } from './useMarketplaceClient';
import { useTxRunner } from './useTxRunner';
import { config } from '../lib/config';
import { fireConfetti } from '../lib/confetti';
import { queryKeys } from '../lib/queryClient';
import type { Listing } from '../types';

/** Buys a listed NFT, optimistically removing it from the grid. */
export function usePurchaseNft() {
  const client = useMarketplaceClient();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const { status, run, simulate, reset } = useTxRunner();

  const purchase = useCallback(
    async (listing: Listing) => {
      if (config.demoMode) {
        const { useDemoStore } = await import('../stores/demoStore');
        const sig = await simulate({
          pendingTitle: 'Purchasing NFT…',
          successTitle: 'Purchase complete 🎉',
          successDescription: 'The NFT is now in your wallet.',
          apply: () => useDemoStore.getState().buyNft(listing.address),
        });
        if (sig) fireConfetti();
        return sig;
      }
      if (!publicKey) return null;
      const ix = await client.purchaseNftIx(
        publicKey,
        new PublicKey(listing.seller),
        new PublicKey(listing.nftMint),
      );

      const sig = await run([ix], {
        // Token-program CPI + ATA creation can exceed the default budget.
        computeUnitLimit: 300_000,
        pendingTitle: 'Purchasing NFT…',
        successTitle: 'Purchase complete 🎉',
        successDescription: 'The NFT is now in your wallet.',
        optimisticUpdate: () => {
          const prev = queryClient.getQueryData<Listing[]>(queryKeys.listings) ?? [];
          queryClient.setQueryData<Listing[]>(
            queryKeys.listings,
            prev.filter((l) => l.address !== listing.address),
          );
          return () => queryClient.setQueryData<Listing[]>(queryKeys.listings, prev);
        },
        onConfirmed: () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.listings });
          queryClient.invalidateQueries({ queryKey: queryKeys.marketplace });
          queryClient.invalidateQueries({
            queryKey: queryKeys.ownedNfts(publicKey.toBase58()),
          });
        },
      });
      if (sig) fireConfetti();
      return sig;
    },
    [client, publicKey, queryClient, run, simulate],
  );

  return { purchase, status, reset };
}
