import { describe, it, expect, beforeEach } from 'vitest';
import { useOffersStore } from './offersStore';
import { useDemoStore } from './demoStore';
import { DEMO_LISTINGS, DEMO_WALLET } from '../lib/demo/demoData';

describe('offersStore (bids: make / cancel / accept)', () => {
  beforeEach(() => {
    useOffersStore.setState({ offers: [] });
    useDemoStore.setState({ listings: [...DEMO_LISTINGS] });
  });

  it('makes an offer from the demo wallet', () => {
    const mint = DEMO_LISTINGS[0].nftMint;
    useOffersStore.getState().makeOffer(mint, 1.25);
    const offers = useOffersStore.getState().offersForMint(mint);
    expect(offers).toHaveLength(1);
    expect(offers[0].bidder).toBe(DEMO_WALLET);
    expect(offers[0].priceSol).toBe(1.25);
  });

  it('cancels an offer by id', () => {
    const mint = DEMO_LISTINGS[0].nftMint;
    useOffersStore.getState().makeOffer(mint, 1);
    const id = useOffersStore.getState().offers[0].id;
    useOffersStore.getState().cancelOffer(id);
    expect(useOffersStore.getState().offersForMint(mint)).toHaveLength(0);
  });

  it('accepting an offer removes the listing and clears its offers', () => {
    const target = DEMO_LISTINGS[0];
    useOffersStore.getState().makeOffer(target.nftMint, 2);
    const id = useOffersStore.getState().offers[0].id;

    useOffersStore.getState().acceptOffer(id);

    expect(useDemoStore.getState().listings.some((l) => l.nftMint === target.nftMint)).toBe(false);
    expect(useOffersStore.getState().offersForMint(target.nftMint)).toHaveLength(0);
  });

  it('sorts offers highest-first', () => {
    const mint = DEMO_LISTINGS[0].nftMint;
    useOffersStore.getState().makeOffer(mint, 1);
    useOffersStore.getState().makeOffer(mint, 3);
    useOffersStore.getState().makeOffer(mint, 2);
    const prices = useOffersStore.getState().offersForMint(mint).map((o) => o.priceSol);
    expect(prices).toEqual([3, 2, 1]);
  });
});
