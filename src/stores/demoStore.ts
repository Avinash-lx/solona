import { create } from 'zustand';
import {
  DEMO_LISTINGS,
  DEMO_METADATA,
  DEMO_OWNED,
  DEMO_WALLET,
  genDemoMint,
  makeDemoMetadata,
} from '../lib/demo/demoData';
import { LAMPORTS_PER_SOL } from '../lib/config';
import { makeId } from '../lib/utils';
import { useActivityStore } from './activityStore';
import type { Listing, NftMetadata, OwnedNft } from '../types';

interface MintArgs {
  name: string;
  symbol?: string;
  description?: string;
  image?: string | null;
  attributes?: { trait_type: string; value: string }[];
}

interface DemoState {
  listings: Listing[];
  owned: OwnedNft[];
  /** Live metadata map (seed + freshly minted). */
  metadata: Record<string, NftMetadata>;
  /** Current owner address per mint — the source of truth for ownership. */
  owners: Record<string, string>;

  mintNft: (args: MintArgs) => string;
  listNft: (mint: string, priceSol: number) => void;
  buyNft: (listingAddress: string) => void;
  delistNft: (mint: string) => void;
  /** Listing sold to an external buyer (e.g. an accepted offer). */
  sellListing: (mint: string, priceSol: number, newOwner: string) => void;
  getMetadata: (mint: string) => NftMetadata | null;
  /** The current owner of a mint (falls back to a listing's seller). */
  ownerOf: (mint: string) => string | null;
}

function pushActivity(
  kind: 'list' | 'sale' | 'delist',
  data: { mint?: string; priceSol?: number },
) {
  useActivityStore.getState().push({
    id: makeId('act'),
    kind,
    mint: data.mint,
    priceSol: data.priceSol,
    actor: DEMO_WALLET,
    timestamp: Date.now(),
  });
}

/**
 * Fully client-side marketplace simulation used in demo mode. It lets the user
 * actually mint → list → buy → delist with instant feedback, no wallet, and no
 * deployed program — so the entire UX is demonstrable. Real (non-demo) mode
 * uses the on-chain hooks instead.
 */
/** Seed the ownership map: held NFTs belong to the user; listed ones to their seller. */
function seedOwners(): Record<string, string> {
  const owners: Record<string, string> = {};
  for (const n of DEMO_OWNED) owners[n.mint] = DEMO_WALLET;
  for (const l of DEMO_LISTINGS) owners[l.nftMint] = l.seller;
  return owners;
}

export const useDemoStore = create<DemoState>((set, get) => ({
  listings: [...DEMO_LISTINGS],
  owned: DEMO_OWNED.map((n) => ({ ...n })),
  metadata: { ...DEMO_METADATA },
  owners: seedOwners(),

  getMetadata: (mint) => get().metadata[mint] ?? null,
  ownerOf: (mint) =>
    get().owners[mint] ?? get().listings.find((l) => l.nftMint === mint)?.seller ?? null,

  mintNft: ({ name, symbol, description, image, attributes }) => {
    const mint = genDemoMint();
    const metadata = makeDemoMetadata({ mint, name, symbol, description, image, attributes });
    set((s) => ({
      metadata: { ...s.metadata, [mint]: metadata },
      owners: { ...s.owners, [mint]: DEMO_WALLET },
      owned: [
        { mint, tokenAccount: `demo-ata-${mint.slice(0, 6)}`, amount: 1, metadata },
        ...s.owned,
      ],
    }));
    return mint;
  },

  listNft: (mint, priceSol) => {
    const lamports = Math.round(priceSol * LAMPORTS_PER_SOL);
    set((s) => {
      if (!s.owned.some((n) => n.mint === mint)) return s;
      const listing: Listing = {
        address: `demo-listing-${mint.slice(0, 8)}`,
        seller: DEMO_WALLET,
        nftMint: mint,
        vault: `demo-vault-${mint.slice(0, 8)}`,
        priceLamports: lamports,
        priceSol,
        createdAt: Math.floor(Date.now() / 1000),
      };
      return {
        owned: s.owned.filter((n) => n.mint !== mint),
        listings: [listing, ...s.listings],
      };
    });
    pushActivity('list', { mint, priceSol });
  },

  buyNft: (listingAddress) => {
    const listing = get().listings.find((l) => l.address === listingAddress);
    if (!listing) return;
    const meta = get().metadata[listing.nftMint];
    set((s) => ({
      listings: s.listings.filter((l) => l.address !== listingAddress),
      // Ownership transfers from the seller to the buyer (the demo user).
      owners: { ...s.owners, [listing.nftMint]: DEMO_WALLET },
      owned: [
        {
          mint: listing.nftMint,
          tokenAccount: `demo-ata-${listing.nftMint.slice(0, 6)}`,
          amount: 1,
          metadata: meta ?? null,
        },
        ...s.owned,
      ],
    }));
    pushActivity('sale', { mint: listing.nftMint, priceSol: listing.priceSol });
  },

  delistNft: (mint) => {
    const listing = get().listings.find((l) => l.nftMint === mint);
    if (!listing) return;
    const meta = get().metadata[mint];
    set((s) => ({
      listings: s.listings.filter((l) => l.nftMint !== mint),
      owned: [
        { mint, tokenAccount: `demo-ata-${mint.slice(0, 6)}`, amount: 1, metadata: meta ?? null },
        ...s.owned,
      ],
    }));
    pushActivity('delist', { mint, priceSol: listing.priceSol });
  },

  sellListing: (mint, priceSol, newOwner) => {
    if (!get().listings.some((l) => l.nftMint === mint)) return;
    set((s) => ({
      listings: s.listings.filter((l) => l.nftMint !== mint),
      // Ownership transfers to the accepted bidder.
      owners: { ...s.owners, [mint]: newOwner },
    }));
    pushActivity('sale', { mint, priceSol });
  },
}));
