# On-chain program — `nft_marketplace` (Anchor)

The Solana program behind the marketplace: escrow-based **list / purchase /
delist**, an admin-configurable fee, and a one-time **initialize**. Deploy this
to Devnet and the frontend (set `VITE_DEMO_MODE=false`) trades for real.

> Program ID: `6MAZYi6WaiB8ztJuJjoAVkbQDxZxfuQuJR3KfrfZncih`

## Instructions

| Instruction | What it does |
| --- | --- |
| `initialize_marketplace(name, fee_bps)` | Create the marketplace config + treasury PDA. Caller becomes authority. |
| `list_nft(price)` | Move the NFT into a program vault (PDA token account) and create a listing. |
| `purchase_nft()` | Buyer pays; fee → treasury, remainder → seller; NFT → buyer; vault + listing closed. |
| `delist_nft()` | Return the NFT from the vault to the seller; close vault + listing. |
| `update_fee(fee_bps)` | Authority-only fee update. |

PDA seeds (must match the frontend in `src/lib/anchor/pdas.ts`):

```
marketplace = ["marketplace", name]
treasury    = ["treasury",    marketplace]
listing     = ["listing",     marketplace, nft_mint]
vault       = ["vault",       marketplace, nft_mint]
```

## Prerequisites

- Rust + Solana CLI (`sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"`)
- Anchor 0.30.1 via avm (`cargo install --git https://github.com/coral-xyz/anchor avm --locked && avm install 0.30.1 && avm use 0.30.1`)
- A funded Devnet keypair: `solana-keygen new` then `solana airdrop 2 --url devnet`

## Build, deploy, wire up

```bash
cd anchor
solana config set --url devnet

# 1. Build
anchor build

# 2. Match the program ID to your deploy keypair (first time only)
anchor keys sync          # updates declare_id! + Anchor.toml
#   If you keep the bundled ID, ensure target/deploy/nft_marketplace-keypair.json
#   corresponds to it, or generate a new ID and update VITE_PROGRAM_ID in ../.env

# 3. Deploy to Devnet
anchor deploy --provider.cluster devnet

# 4. Export the IDL the frontend uses (overwrites the bundled, hand-authored one)
anchor idl build -o ../src/lib/anchor/idl.json
#   (or: anchor idl fetch <PROGRAM_ID> -o ../src/lib/anchor/idl.json)
```

The frontend decoder reads field names from the IDL and tolerates **both**
camelCase (bundled) and snake_case (anchor-generated), so step 4 is safe.

## Point the frontend at it

In the repo root `.env`:

```bash
VITE_PROGRAM_ID=<your deployed program id>   # if you changed it
VITE_MARKETPLACE_NAME=devnet-marketplace     # must match the name you initialize with
VITE_DEMO_MODE=false                         # use real on-chain data
```

Then run the app, open **/admin** with the authority wallet, and **Initialize**
the marketplace (use the same name as `VITE_MARKETPLACE_NAME`). From then on,
mint → list → buy → delist are real Devnet transactions.

## Note

This program is provided as deployable source. I authored it to match the
frontend's PDA seeds, account layout, and instruction set, but the build
sandbox has no Rust/Solana toolchain, so **run `anchor build` to compile it**
(it will surface any environment-specific tweaks). The frontend is already
IDL-driven, so once deployed + `idl build`, no client code changes are needed.
