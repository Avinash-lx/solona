import { create } from 'zustand';
import { DEMO_LISTINGS, DEMO_WALLET } from '../lib/demo/demoData';
import { useDemoStore } from './demoStore';
import { makeId } from '../lib/utils';
import { notify } from '../lib/notifications';
import type { Offer } from '../types';

/**
 * Bids/offers — fully interactive in demo mode. (Live mode would require a new
 * on-chain instruction with an offer-escrow PDA; see the offers roadmap note.)
 *
 * The demo user (DEMO_WALLET) can make offers on any NFT and accept incoming
 * offers on their own listings. We seed a couple of incoming bids from fake
 * collectors so there's something to accept out of the box.
 */
const FAKE_BIDDERS = [
  'B1dD3r1111111111111111111111111111111111111',
  'C0LLectoR222222222222222222222222222222222',
];

function seedOffers(): Offer[] {
  return DEMO_LISTINGS.slice(0, 2).map((l, i) => ({
    id: makeId('offer'),
    mint: l.nftMint,
    bidder: FAKE_BIDDERS[i % FAKE_BIDDERS.length],
    // An incoming bid slightly below ask.
    priceSol: Math.max(0.01, Math.round(l.priceSol * 0.8 * 100) / 100),
    createdAt: Date.now() - i * 60_000,
  }));
}

interface OffersState {
  offers: Offer[];
  makeOffer: (mint: string, priceSol: number) => void;
  cancelOffer: (id: string) => void;
  acceptOffer: (id: string) => void;
  offersForMint: (mint: string) => Offer[];
}

export const useOffersStore = create<OffersState>((set, get) => ({
  offers: seedOffers(),

  offersForMint: (mint) =>
    get()
      .offers.filter((o) => o.mint === mint)
      .sort((a, b) => b.priceSol - a.priceSol),

  makeOffer: (mint, priceSol) => {
    const offer: Offer = {
      id: makeId('offer'),
      mint,
      bidder: DEMO_WALLET,
      priceSol,
      createdAt: Date.now(),
    };
    set((s) => ({ offers: [offer, ...s.offers] }));
    notify({ variant: 'success', title: 'Offer placed', description: `${priceSol} SOL bid submitted.` });
  },

  cancelOffer: (id) => set((s) => ({ offers: s.offers.filter((o) => o.id !== id) })),

  acceptOffer: (id) => {
    const offer = get().offers.find((o) => o.id === id);
    if (!offer) return;
    // The NFT is sold to the bidder: transfer ownership, remove the listing,
    // and clear that mint's offers.
    useDemoStore.getState().sellListing(offer.mint, offer.priceSol, offer.bidder);
    set((s) => ({ offers: s.offers.filter((o) => o.mint !== offer.mint) }));
    notify({
      variant: 'success',
      title: 'Offer accepted 🎉',
      description: `Sold for ${offer.priceSol} SOL.`,
    });
  },
}));
