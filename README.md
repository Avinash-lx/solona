# Solana NFT Marketplace (Devnet) — frontend-only dApp

A production-quality NFT marketplace trading UI for Solana **Devnet**. There is
**no traditional backend**: every piece of state comes from on-chain accounts,
read directly over RPC and kept live via Solana account-change WebSocket
subscriptions. Local-only features (favorites, collections, alerts, theme) are
persisted in the browser (IndexedDB / localStorage).

> Program ID: `6MAZYi6WaiB8ztJuJjoAVkbQDxZxfuQuJR3KfrfZncih`

---

## Tech stack

- **React 18 + TypeScript** (strict, no `any`)
- **Vite** with Buffer/process browser polyfills for Solana
- **Tailwind CSS** (dark/light)
- **TanStack React Query** — on-chain data fetching + caching
- **Zustand** (global state, persisted) + **React Context** (wallet/provider plumbing)
- **@solana/wallet-adapter** — Phantom, Solflare, Backpack
- **@coral-xyz/anchor** — typed client generated from the bundled IDL
- **@metaplex-foundation/** — Token Metadata resolution from IPFS/Arweave
- **Vitest + Testing Library** — focused unit/render tests

## Quick start

```bash
cp .env.example .env      # adjust if you have a dedicated RPC
npm install
npm run dev               # http://localhost:5173, talking to Devnet
```

### See it populated immediately (demo mode)

A live Devnet marketplace needs an initialized config + real listings before the
grid shows anything. To explore the full UX **without** any wallet or on-chain
state, enable demo mode — it seeds realistic sample listings/NFTs with offline
SVG art (no network, never sends transactions):

```bash
echo "VITE_DEMO_MODE=true" >> .env
npm run dev
```

A banner makes it clear the data is seeded. Set it back to `false` for live Devnet.

Other scripts:

```bash
npm run build       # tsc + vite production build → ./dist
npm run preview     # serve the production build locally
npm run test        # run the Vitest suite once
npm run typecheck   # strict type check
npm run lint        # eslint
```

## Environment variables

All vars are **public, build-time** values (no secrets — never commit a real `.env`).

| Var | Default | Purpose |
| --- | --- | --- |
| `VITE_RPC_URL` | `https://api.devnet.solana.com` | RPC HTTP endpoint. A dedicated provider (Helius/QuickNode) is strongly recommended for reliable WebSocket subscriptions. |
| `VITE_RPC_WS_URL` | derived from RPC | Optional dedicated WebSocket endpoint. |
| `VITE_PROGRAM_ID` | the program above | Anchor program ID. |
| `VITE_NETWORK` | `devnet` | Cluster. The UI forces Devnet and warns on mismatch. |
| `VITE_MARKETPLACE_NAME` | `devnet-marketplace` | Name used as the marketplace PDA seed — **must match the on-chain config**. |
| `VITE_FEATURE_OFFERS` | `false` | Feature flag for the offers/bids roadmap UI (non-functional — see below). |

## How the real-time (no-backend) layer works

The program's accounts *are* the database. `src/hooks/useRealtimeSync.ts` mounts
once at the app root and wires the on-chain firehose into the UI:

1. **`onProgramAccountChange`** (filtered server-side by the `Listing` account
   discriminator via a `memcmp` filter) streams every listing create / price
   change / close. The handler **upserts or removes** listings directly in the
   React Query cache, so the grid updates instantly — **no polling**.
2. **`onLogs`** (program-scoped) parses each instruction (`Instruction: ListNft`
   / `PurchaseNft` / `DelistNft` / `UpdateFee`) to (a) build the live **activity
   feed** and (b) disambiguate a closed listing as a **sale vs delist** — the
   account subscription alone can't tell them apart.
3. From these streams we derive **per-listing price history**, a **collection
   floor tracker**, evaluate **client-side price alerts**, and raise toasts /
   browser notifications (e.g. *"your listing sold"*, *"a favorited item changed
   price"*).

The marketplace config account and the connected wallet's balance use
`onAccountChange` the same way. **All subscriptions are cleaned up on unmount**
(`removeSubscription` / `removeOnLogsListener`).

PDA derivation and account decoding are driven entirely by the **bundled IDL**
(`src/lib/anchor/idl.json`) — no hardcoded byte layouts. See
`src/lib/anchor/{pdas,decoders,program}.ts`.

### PDA seeds

```
marketplace = ["marketplace", name]
treasury    = ["treasury",    marketplace]
listing     = ["listing",     marketplace, nftMint]
vault       = ["vault",       marketplace, nftMint]   # program-owned escrow token account
```

## End-to-end flow: mint → list → buy → sell

The platform supports the full NFT lifecycle on Devnet:

1. **Mint** (`/mint`, "Create" tab): mints a real 1/1 NFT into your wallet via
   Metaplex Token Metadata. Upload an image (stored on Irys) or point at an
   existing metadata JSON URI. This is independent of the marketplace program —
   it just gives you something to trade. Needs a little Devnet SOL (use a
   faucet); the Irys-free path accepts a ready-made metadata URI.
2. **List** (`/portfolio` → Owned NFTs → *List for sale*): escrows the NFT into
   the program vault PDA at your chosen price.
3. **Buy** (`/`): any other wallet purchases it; SOL is split between seller and
   the marketplace treasury, and the NFT transfers to the buyer.
4. **Sell / delist**: it sells automatically when bought, or you can delist from
   *My Active Listings* to pull it back out of escrow.

> Steps 2–4 require the marketplace program to be deployed and initialized
> (`/admin` → Initialize, once). Step 1 works on its own. If you just want to see
> the UI populated without any of this, use **demo mode** (above).

## Features

- **Wallet**: multi-wallet connect modal, address + live SOL balance, Devnet
  mismatch banner.
- **Mint / Create**: Metaplex 1/1 NFT minting with image/metadata upload (Irys)
  or a direct metadata URI.
- **Browse**: live grid of active listings with image, name, collection, price,
  seller; lazy images + skeletons.
- **Search & filter**: by name/collection/price range, sort (price ↑/↓, recent,
  rarity); debounced and **URL-synced** (shareable filtered views).
- **Buy**: pre-tx fee/total breakdown, confirmation modal, staged tx tracker
  (sent → confirmed → finalized) with Explorer links; optimistic removal +
  rollback on failure.
- **List / Delist**: escrow an owned NFT into the vault PDA; clear escrow
  explanation; delist from *My Listings*.
- **Portfolio**: tabs for *Owned NFTs* (wallet-held, via Metaplex) and *My Active
  Listings* (on-chain); CSV export of both.
- **Favorites**: local-first (IndexedDB) heart toggle + Favorites view.
- **Drag-and-drop organizer**: group favorites into custom local collections
  (dnd-kit), reorderable, persisted locally, keyboard-operable.
- **Admin panel**: visible only when the connected wallet is the on-chain
  marketplace authority; shows fee + treasury, allows `updateFee`, and offers a
  one-time `initializeMarketplace`. Every admin action is guarded in the UI *and*
  by checking the on-chain authority.
- **Extras**: rarity badges from trait frequency, per-listing price history +
  collection floor, watchlist price alerts, dark/light theme, full keyboard nav
  + ARIA, robust empty/error/loading states, RPC retry with backoff, shareable
  deep links, browser notifications.

## Admin setup

The first wallet to call `initializeMarketplace` becomes the **authority**. If no
marketplace config exists for `VITE_MARKETPLACE_NAME`, connect that wallet and
open **/admin** — you'll get the initialize form (set the name to match
`VITE_MARKETPLACE_NAME` so the rest of the app resolves the same PDA). Afterwards
the **Admin** tab and fee controls appear only for that authority wallet; all
others are blocked in the UI and on-chain.

## Testing

Focused Vitest + Testing Library coverage on the critical paths:

- PDA derivation (`src/lib/anchor/pdas.test.ts`)
- IDL account decoding / discriminators (`src/lib/anchor/decoders.test.ts`)
- price/fee math (`src/lib/anchor/feeMath.test.ts`)
- favorites store (`src/stores/favoritesStore.test.ts`)
- filter/sort pipeline (`src/hooks/useListingFilters.test.ts`)
- rarity scoring (`src/lib/rarity.test.ts`)
- a happy-path render of the browse grid (`src/features/marketplace/ListingGrid.test.tsx`)

Crypto-heavy tests run in the `node` environment; render tests opt into `jsdom`
per-file. The Solana connection and wallet adapter are not hit — pure logic is
tested directly and components are rendered with mocked props.

```bash
npm run test
```

## Deployment

**Vercel** (SPA rewrites + headers in `vercel.json`):

```bash
./deploy.sh vercel      # or: vercel --prod
```

**Docker** (multi-stage build → nginx with SPA fallback, gzip, security headers,
asset caching):

```bash
./deploy.sh docker      # docker compose up --build -d  → http://localhost:8080
```

Build-time `VITE_*` values are passed as Docker build args / compose env (see
`docker-compose.yml`). `deploy.sh build` just produces `./dist`.

## Roadmap — Offers / bids (NOT implemented on-chain)

Offers/bids are scaffolded behind the `VITE_FEATURE_OFFERS` flag
(`src/features/offers/OffersPanel.tsx`) and rendered **non-functionally**.
Accepting escrowed offers requires a **new on-chain instruction** (e.g.
`makeOffer` / `acceptOffer` with an offer-escrow PDA) that the current program
does not expose. We deliberately **do not fake on-chain behavior** — the panel is
a clearly-marked preview only. Enabling the flag shows the planned UX; wiring it
up is a future program upgrade.

## Project structure

```
src/
  components/   ui primitives + shared feature components
  features/     marketplace, portfolio, favorites, admin, nft, offers
  hooks/        useMarketplace, useListings, useOwnedNfts, useRealtimeSync, tx hooks…
  lib/
    anchor/     program client, PDA helpers, bundled IDL, decoders, fee math
    solana/     connection, subscriptions, tx send/confirm, metadata, errors
  providers/    wallet + query providers
  stores/       zustand (favorites, collections, watchlist, theme, activity, …)
  types/        shared types derived from the IDL
```

## Notes & limitations

- The bundled IDL mirrors the program's instruction/account shape so the typed
  client, PDA derivation, and Borsh decoding are correct in form. If the deployed
  program differs, regenerate with `anchor idl fetch <PROGRAM_ID>` into
  `src/lib/anchor/idl.json` — the rest of the app is IDL-driven and adapts.
- Public Devnet RPC rate-limits `onLogs`/`getProgramAccounts`; for a smooth
  experience point `VITE_RPC_URL`/`VITE_RPC_WS_URL` at a dedicated provider.
- Price history and the activity feed are session-scoped (and locally cached) —
  the honest scope of a backend-less, log-derived design.
```
