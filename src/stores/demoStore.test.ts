import { describe, it, expect, beforeEach } from 'vitest';
import { useDemoStore } from './demoStore';
import { DEMO_LISTINGS, DEMO_OWNED } from '../lib/demo/demoData';

describe('demoStore (interactive mint→list→buy→delist)', () => {
  beforeEach(() => {
    useDemoStore.setState({
      listings: [...DEMO_LISTINGS],
      owned: DEMO_OWNED.map((n) => ({ ...n })),
      metadata: { ...useDemoStore.getState().metadata },
    });
  });

  it('mints a new NFT into the owned set with resolvable metadata', () => {
    const before = useDemoStore.getState().owned.length;
    const mint = useDemoStore.getState().mintNft({ name: 'Test Ape', attributes: [] });
    const s = useDemoStore.getState();
    expect(s.owned.length).toBe(before + 1);
    expect(s.owned[0].mint).toBe(mint);
    expect(s.getMetadata(mint)?.name).toBe('Test Ape');
  });

  it('lists an owned NFT (moves it from owned to listings)', () => {
    const mint = useDemoStore.getState().mintNft({ name: 'Listable', attributes: [] });
    useDemoStore.getState().listNft(mint, 3.5);
    const s = useDemoStore.getState();
    expect(s.owned.some((n) => n.mint === mint)).toBe(false);
    const listing = s.listings.find((l) => l.nftMint === mint);
    expect(listing?.priceSol).toBe(3.5);
  });

  it('buys a listing (removes it and adds to owned)', () => {
    const target = useDemoStore.getState().listings[0];
    const ownedBefore = useDemoStore.getState().owned.length;
    useDemoStore.getState().buyNft(target.address);
    const s = useDemoStore.getState();
    expect(s.listings.some((l) => l.address === target.address)).toBe(false);
    expect(s.owned.some((n) => n.mint === target.nftMint)).toBe(true);
    expect(s.owned.length).toBe(ownedBefore + 1);
  });

  it('delists a listing back to owned', () => {
    const mint = useDemoStore.getState().mintNft({ name: 'RoundTrip', attributes: [] });
    useDemoStore.getState().listNft(mint, 1);
    useDemoStore.getState().delistNft(mint);
    const s = useDemoStore.getState();
    expect(s.listings.some((l) => l.nftMint === mint)).toBe(false);
    expect(s.owned.some((n) => n.mint === mint)).toBe(true);
  });
});
