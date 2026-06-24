import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { NftImage } from '../../components/NftImage';
import { FavoriteButton } from '../../components/FavoriteButton';
import { RarityBadge } from '../../components/RarityBadge';
import { formatSol, shortenAddress } from '../../lib/utils';
import type { EnrichedListing } from '../../types';

interface ListingCardProps {
  listing: EnrichedListing;
  onBuy: (listing: EnrichedListing) => void;
}

export function ListingCard({ listing, onBuy }: ListingCardProps) {
  const { publicKey } = useWallet();
  const isOwn = publicKey?.toBase58() === listing.seller;
  const name = listing.metadata?.name ?? 'Loading…';
  const collection = listing.metadata?.collection;

  return (
    <div className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <Link to={`/nft/${listing.nftMint}`} className="relative block" aria-label={`View ${name}`}>
        <NftImage src={listing.metadata?.image ?? null} alt={name} className="aspect-square w-full" />
        <div className="absolute right-2 top-2">
          <FavoriteButton mint={listing.nftMint} />
        </div>
        {listing.rarityTier && (
          <div className="absolute left-2 top-2">
            <RarityBadge tier={listing.rarityTier} rank={listing.rarityRank} />
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link to={`/nft/${listing.nftMint}`} className="min-w-0">
          <h3 className="truncate font-semibold" title={name}>
            {name}
          </h3>
          {collection && (
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400" title={collection}>
              {collection}
            </p>
          )}
        </Link>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-400">Price</p>
            <p className="text-lg font-bold tabular-nums">{formatSol(listing.priceSol)} SOL</p>
          </div>
          <p className="text-right text-[10px] text-zinc-400">
            Seller
            <br />
            <span className="font-mono text-zinc-500">{shortenAddress(listing.seller)}</span>
          </p>
        </div>

        <button
          type="button"
          className="btn-primary mt-3 w-full"
          disabled={isOwn}
          onClick={() => onBuy(listing)}
          title={isOwn ? 'You cannot buy your own listing' : undefined}
        >
          {isOwn ? 'Your listing' : 'Buy now'}
        </button>
      </div>
    </div>
  );
}
