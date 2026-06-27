import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useQuery } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { useDemoStore } from '../stores/demoStore';
import { DEMO_WALLET } from '../lib/demo/demoData';
import { config } from '../lib/config';
import { isValidPublicKey } from '../lib/utils';

export interface NftOwnership {
  /** Current owner's wallet address, or null if unknown. */
  owner: string | null;
  /** True when the current viewer is the owner. */
  isYou: boolean;
  isLoading: boolean;
}

/**
 * Resolves the current OWNER of an NFT — the heart of an NFT platform.
 *
 * - Demo mode: read from the client-side ownership map (updates instantly on
 *   buy / accept-offer / mint / delist).
 * - Live mode: read the real on-chain holder via getTokenLargestAccounts →
 *   the token account holding the 1 supply → its owner.
 */
export function useNftOwner(mint: string | null | undefined): NftOwnership {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  // Demo ownership (reactive: re-renders when ownership changes).
  const demoOwner = useDemoStore((s) =>
    mint ? s.owners[mint] ?? s.listings.find((l) => l.nftMint === mint)?.seller ?? null : null,
  );

  const query = useQuery<string | null>({
    queryKey: ['owner', mint],
    enabled: !config.demoMode && Boolean(mint) && isValidPublicKey(mint ?? ''),
    queryFn: async () => {
      const mintPk = new PublicKey(mint!);
      const largest = await connection.getTokenLargestAccounts(mintPk);
      const holder = largest.value.find((a) => a.uiAmount === 1) ?? largest.value[0];
      if (!holder) return null;
      const info = await connection.getParsedAccountInfo(holder.address);
      const data = info.value?.data;
      if (data && 'parsed' in data) {
        return (data.parsed?.info?.owner as string) ?? null;
      }
      return null;
    },
  });

  const owner = config.demoMode ? demoOwner : query.data ?? null;
  const me = config.demoMode ? DEMO_WALLET : publicKey?.toBase58() ?? null;

  return {
    owner,
    isYou: Boolean(owner && me && owner === me),
    isLoading: config.demoMode ? false : query.isLoading,
  };
}
