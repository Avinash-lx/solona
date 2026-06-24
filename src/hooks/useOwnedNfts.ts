import { useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useQuery } from '@tanstack/react-query';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useNftMetadataBatch } from './useNftMetadata';
import { useDemoStore } from '../stores/demoStore';
import { config } from '../lib/config';
import { queryKeys } from '../lib/queryClient';
import type { OwnedNft } from '../types';

interface RawOwnedToken {
  mint: string;
  tokenAccount: string;
  amount: number;
}

/**
 * NFTs currently held in the wallet (SPL token accounts with balance 1 / 0
 * decimals). In demo mode this is the live client-side owned set so newly
 * minted / delisted / bought NFTs appear instantly. Escrowed (listed) NFTs
 * live in a vault, so they correctly do NOT appear here.
 */
export function useOwnedNfts() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const owner = publicKey?.toBase58() ?? '';
  // Subscribe to the demo owned set so mint/buy/delist re-render the portfolio.
  const demoOwned = useDemoStore((s) => s.owned);

  const tokensQuery = useQuery<RawOwnedToken[]>({
    queryKey: queryKeys.ownedNfts(owner),
    enabled: Boolean(publicKey) && !config.demoMode,
    queryFn: async () => {
      const res = await connection.getParsedTokenAccountsByOwner(
        publicKey!,
        { programId: TOKEN_PROGRAM_ID },
        'confirmed',
      );
      return res.value
        .map(({ pubkey, account }) => {
          const info = account.data.parsed.info;
          const tokenAmount = info.tokenAmount;
          return {
            mint: info.mint as string,
            tokenAccount: pubkey.toBase58(),
            amount: Number(tokenAmount.uiAmount ?? 0),
            decimals: Number(tokenAmount.decimals ?? 0),
          };
        })
        .filter((t) => t.amount === 1 && t.decimals === 0)
        .map(({ mint, tokenAccount, amount }) => ({ mint, tokenAccount, amount }));
    },
  });

  const mints = useMemo(
    () => (tokensQuery.data ?? []).map((t) => t.mint),
    [tokensQuery.data],
  );
  const { metadataByMint, isLoading: metadataLoading } = useNftMetadataBatch(mints);

  const nfts = useMemo<OwnedNft[]>(
    () =>
      (tokensQuery.data ?? []).map((t) => ({
        ...t,
        metadata: metadataByMint[t.mint] ?? null,
      })),
    [tokensQuery.data, metadataByMint],
  );

  if (config.demoMode) {
    return {
      nfts: demoOwned,
      isLoading: false,
      isMetadataLoading: false,
      isError: false,
      error: null,
      refetch: () => {},
    };
  }

  return {
    nfts,
    isLoading: tokensQuery.isLoading,
    isMetadataLoading: metadataLoading,
    isError: tokensQuery.isError,
    error: tokensQuery.error,
    refetch: tokensQuery.refetch,
  };
}
