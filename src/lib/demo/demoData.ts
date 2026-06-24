import { LAMPORTS_PER_SOL } from '../config';
import type { Listing, NftMetadata, OwnedNft } from '../../types';

/**
 * Self-contained demo dataset used when VITE_DEMO_MODE=true. Images are inline
 * SVG data-URIs so the marketplace renders fully populated WITHOUT any network,
 * RPC, or on-chain state — ideal for screenshots, design review, and trying the
 * UX before a real marketplace + listings exist on Devnet.
 *
 * This never sends transactions; it only seeds the read models.
 */

const PALETTES: [string, string][] = [
  ['#9945FF', '#14F195'],
  ['#FF6B6B', '#FFD93D'],
  ['#4D96FF', '#6BCB77'],
  ['#F72585', '#7209B7'],
  ['#06FFA5', '#1B98E0'],
  ['#FFB703', '#FB8500'],
  ['#B5179E', '#480CA8'],
  ['#2EC4B6', '#E71D36'],
];

/** Build a deterministic gradient SVG (as a data-URI) for a demo NFT. */
export function svgImage(seed: number, label: string): string {
  const [a, b] = PALETTES[seed % PALETTES.length];
  const initials = label.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 2).toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='${a}'/>
      <stop offset='1' stop-color='${b}'/>
    </linearGradient>
  </defs>
  <rect width='400' height='400' fill='url(#g)'/>
  <circle cx='${80 + (seed * 53) % 240}' cy='${90 + (seed * 31) % 220}' r='70' fill='white' opacity='0.12'/>
  <circle cx='${120 + (seed * 71) % 200}' cy='${140 + (seed * 17) % 180}' r='110' fill='white' opacity='0.08'/>
  <text x='50%' y='50%' dominant-baseline='central' text-anchor='middle'
    font-family='Inter,system-ui,sans-serif' font-size='130' font-weight='800' fill='white' opacity='0.92'>${initials}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

interface Seed {
  mint: string;
  name: string;
  collection: string;
  priceSol: number;
  traits: [string, string][];
}

const SEEDS: Seed[] = [
  { mint: 'DemoMint1111111111111111111111111111111111', name: 'Solar Fox #014', collection: 'Solar Foxes', priceSol: 2.4, traits: [['Background', 'Aurora'], ['Fur', 'Ember'], ['Eyes', 'Laser']] },
  { mint: 'DemoMint2222222222222222222222222222222222', name: 'Neon Ape #207', collection: 'Neon Apes', priceSol: 5.1, traits: [['Background', 'Void'], ['Skin', 'Chrome'], ['Hat', 'Crown']] },
  { mint: 'DemoMint3333333333333333333333333333333333', name: 'Pixel Punk #88', collection: 'Pixel Punks', priceSol: 1.05, traits: [['Background', 'Mint'], ['Type', 'Alien'], ['Accessory', 'Pipe']] },
  { mint: 'DemoMint4444444444444444444444444444444444', name: 'Cosmic Cat #511', collection: 'Cosmic Cats', priceSol: 0.75, traits: [['Background', 'Nebula'], ['Fur', 'Galaxy'], ['Eyes', 'Star']] },
  { mint: 'DemoMint5555555555555555555555555555555555', name: 'Solar Fox #002', collection: 'Solar Foxes', priceSol: 3.3, traits: [['Background', 'Sunset'], ['Fur', 'Gold'], ['Eyes', 'Calm']] },
  { mint: 'DemoMint6666666666666666666666666666666666', name: 'Glitch Bot #340', collection: 'Glitch Bots', priceSol: 8.0, traits: [['Background', 'Matrix'], ['Body', 'Titanium'], ['Core', 'Plasma']] },
  { mint: 'DemoMint7777777777777777777777777777777777', name: 'Neon Ape #019', collection: 'Neon Apes', priceSol: 4.2, traits: [['Background', 'Acid'], ['Skin', 'Neon'], ['Hat', 'Beanie']] },
  { mint: 'DemoMint8888888888888888888888888888888888', name: 'Pixel Punk #12', collection: 'Pixel Punks', priceSol: 1.6, traits: [['Background', 'Coral'], ['Type', 'Zombie'], ['Accessory', 'Shades']] },
  { mint: 'DemoMint9999999999999999999999999999999999', name: 'Cosmic Cat #077', collection: 'Cosmic Cats', priceSol: 2.0, traits: [['Background', 'Deep Space'], ['Fur', 'Comet'], ['Eyes', 'Wink']] },
  { mint: 'DemoMintAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', name: 'Glitch Bot #001', collection: 'Glitch Bots', priceSol: 12.5, traits: [['Background', 'Genesis'], ['Body', 'Obsidian'], ['Core', 'Antimatter']] },
  { mint: 'DemoMintBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', name: 'Solar Fox #128', collection: 'Solar Foxes', priceSol: 1.9, traits: [['Background', 'Dawn'], ['Fur', 'Silver'], ['Eyes', 'Sharp']] },
  { mint: 'DemoMintCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', name: 'Pixel Punk #03', collection: 'Pixel Punks', priceSol: 0.5, traits: [['Background', 'Sky'], ['Type', 'Human'], ['Accessory', 'Cap']] },
];

const DEMO_SELLERS = [
  '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  '3nW1cF2tQxYpVZ4cD8mJ9rL6sK1bH7aE5gN2dM4uPqR',
  'Bn9qZ5tY1cW8eR3aD7fK2jH6sL4mN0pQ8xV5gT1bU3oC',
];

export const DEMO_METADATA: Record<string, NftMetadata> = Object.fromEntries(
  SEEDS.map((s, i) => [
    s.mint,
    {
      mint: s.mint,
      name: s.name,
      symbol: s.collection.split(' ').map((w) => w[0]).join(''),
      image: svgImage(i, s.name),
      description: `A one-of-a-kind ${s.collection} NFT. This is demo data rendered fully client-side.`,
      collection: s.collection,
      attributes: s.traits.map(([trait_type, value]) => ({ trait_type, value })),
      uri: '',
    },
  ]),
);

export const DEMO_LISTINGS: Listing[] = SEEDS.slice(0, 10).map((s, i) => {
  const priceLamports = Math.round(s.priceSol * LAMPORTS_PER_SOL);
  return {
    address: `DemoListing${i}`.padEnd(44, '0'),
    seller: DEMO_SELLERS[i % DEMO_SELLERS.length],
    nftMint: s.mint,
    vault: `DemoVault${i}`.padEnd(44, '0'),
    priceLamports,
    priceSol: s.priceSol,
    createdAt: Math.floor(Date.now() / 1000) - i * 3600,
  };
});

/** A couple of "owned" demo NFTs (the last two seeds, not currently listed). */
export const DEMO_OWNED: OwnedNft[] = SEEDS.slice(10).map((s) => ({
  mint: s.mint,
  tokenAccount: `DemoAta${s.mint.slice(-6)}`,
  amount: 1,
  metadata: DEMO_METADATA[s.mint],
}));

export function getDemoMetadata(mint: string): NftMetadata | null {
  return DEMO_METADATA[mint] ?? null;
}

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/** Generate a realistic-looking 44-char base58 mint address for demo NFTs. */
export function genDemoMint(): string {
  let out = '';
  for (let i = 0; i < 44; i++) out += BASE58[Math.floor(Math.random() * BASE58.length)];
  return out;
}

/** The demo "current user" wallet address (so listings can show a seller). */
export const DEMO_WALLET = 'DemoUser1111111111111111111111111111111111';

/** Build metadata for a freshly "minted" demo NFT. */
export function makeDemoMetadata(args: {
  mint: string;
  name: string;
  symbol?: string;
  description?: string;
  image?: string | null;
  attributes?: { trait_type: string; value: string }[];
}): NftMetadata {
  return {
    mint: args.mint,
    name: args.name || 'Untitled NFT',
    symbol: args.symbol || '',
    image: args.image || svgImage(Math.floor(Math.random() * 999), args.name || 'NFT'),
    description: args.description || 'Minted in demo mode — fully client-side, no chain required.',
    collection: 'My Mints',
    attributes: (args.attributes ?? []).filter((a) => a.trait_type && a.value),
    uri: '',
  };
}
