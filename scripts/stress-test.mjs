#!/usr/bin/env node
/**
 * Devnet stress-test harness for the NFT marketplace.
 *
 * Drives the REAL on-chain program with a local keypair: bulk-mints NFTs
 * (Metaplex) and lists them via the marketplace program, sequentially or
 * concurrently, with timing + a pass/fail summary. Pairs with the manual
 * checklist in STRESS_TEST.md and the Vitest suite (`npm test`).
 *
 * Usage (run from the project root):
 *   node scripts/stress-test.mjs mint-list        --count 10
 *   node scripts/stress-test.mjs concurrent-list  --count 8
 *   node scripts/stress-test.mjs buy --mint <MINT> --keypair ~/buyer.json
 *
 * Config via env (all optional, sensible Devnet defaults):
 *   RPC        RPC url            (default https://api.devnet.solana.com)
 *   PROGRAM_ID program id         (default Bx1csW3DusPh3Lcij7VMBiGtwhwRBRoobjyZneWGqbM7)
 *   MARKET     marketplace name   (default devnet-marketplace)
 *   KEYPAIR    signer keypair     (default ~/.config/solana/id.json)
 *   URI        metadata json uri  (default a public Metaplex sample)
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import anchor from '@coral-xyz/anchor';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity, generateSigner, percentAmount } from '@metaplex-foundation/umi';
import { createNft, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';

const { AnchorProvider, Program, BN, Wallet } = anchor;

// ---------- args + config ----------
const argv = process.argv.slice(2);
const mode = argv[0];
const flag = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const COUNT = Number(flag('count', '5'));
const RPC = process.env.RPC || 'https://api.devnet.solana.com';
const PROGRAM_ID = process.env.PROGRAM_ID || 'Bx1csW3DusPh3Lcij7VMBiGtwhwRBRoobjyZneWGqbM7';
const MARKET = process.env.MARKET || 'devnet-marketplace';
const URI =
  process.env.URI ||
  'https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/Climate/metadata.json';
const KEYPAIR_PATH = (flag('keypair', process.env.KEYPAIR) || `${homedir()}/.config/solana/id.json`)
  .replace(/^~(?=$|\/)/, homedir());

const enc = (s) => Buffer.from(s, 'utf8');
const programId = new PublicKey(PROGRAM_ID);
const [marketplace] = PublicKey.findProgramAddressSync(
  [enc('marketplace'), enc(MARKET)],
  programId,
);
const listingPda = (mint) =>
  PublicKey.findProgramAddressSync([enc('listing'), marketplace.toBuffer(), mint.toBuffer()], programId)[0];
const vaultPda = (mint) =>
  PublicKey.findProgramAddressSync([enc('vault'), marketplace.toBuffer(), mint.toBuffer()], programId)[0];

function loadKeypair(path) {
  const secret = JSON.parse(readFileSync(resolve(path), 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

function buildProgram(connection, payer) {
  const idl = JSON.parse(readFileSync(new URL('../src/lib/anchor/idl.json', import.meta.url), 'utf8'));
  // Single source of truth: target the configured program id (mirrors the app).
  idl.address = PROGRAM_ID;
  const provider = new AnchorProvider(connection, new Wallet(payer), { commitment: 'confirmed' });
  return new Program(idl, provider);
}

function buildUmi(payer) {
  const umi = createUmi(RPC).use(mplTokenMetadata());
  const umiKp = umi.eddsa.createKeypairFromSecretKey(payer.secretKey);
  return umi.use(keypairIdentity(umiKp));
}

const randomPrice = () => Math.round((0.5 + Math.random() * 2.5) * 100) / 100;
const ms = (t) => `${(t).toFixed(0)}ms`;

// ---------- on-chain ops ----------
async function mintNft(umi, i) {
  const mint = generateSigner(umi);
  await createNft(umi, {
    mint,
    name: `Stress #${i}`,
    symbol: 'STRS',
    uri: URI,
    sellerFeeBasisPoints: percentAmount(5),
    isMutable: true,
    tokenOwner: umi.identity.publicKey,
  }).sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });
  return new PublicKey(mint.publicKey);
}

async function listNft(program, payer, mintPk, priceSol) {
  const sellerTokenAccount = getAssociatedTokenAddressSync(mintPk, payer.publicKey);
  return program.methods
    .listNft(new BN(Math.round(priceSol * LAMPORTS_PER_SOL)))
    .accountsPartial({
      marketplace,
      listing: listingPda(mintPk),
      seller: payer.publicKey,
      nftMint: mintPk,
      sellerTokenAccount,
      vault: vaultPda(mintPk),
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

async function buyNft(program, buyer, mintPk) {
  const listing = await program.account.listing.fetch(listingPda(mintPk));
  const buyerTokenAccount = getAssociatedTokenAddressSync(mintPk, buyer.publicKey);
  const [treasury] = PublicKey.findProgramAddressSync(
    [enc('treasury'), marketplace.toBuffer()],
    programId,
  );
  return program.methods
    .purchaseNft()
    .accountsPartial({
      marketplace,
      listing: listingPda(mintPk),
      buyer: buyer.publicKey,
      seller: listing.seller,
      treasury,
      nftMint: mintPk,
      vault: vaultPda(mintPk),
      buyerTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

// ---------- preflight ----------
async function preflight(connection, payer) {
  console.log(`\n▶ Stress test  ·  ${mode}`);
  console.log(`  RPC        ${RPC}`);
  console.log(`  Program    ${PROGRAM_ID}`);
  console.log(`  Market     ${MARKET}  (${marketplace.toBase58()})`);
  console.log(`  Signer     ${payer.publicKey.toBase58()}`);

  const prog = await connection.getAccountInfo(programId);
  if (!prog?.executable) {
    throw new Error(`Program ${PROGRAM_ID} is not deployed on this cluster. Deploy it first.`);
  }
  const mkt = await connection.getAccountInfo(marketplace);
  if (!mkt) {
    throw new Error(`Marketplace "${MARKET}" not initialized. Run /admin → Initialize first.`);
  }
  const bal = (await connection.getBalance(payer.publicKey)) / LAMPORTS_PER_SOL;
  console.log(`  Balance    ${bal.toFixed(3)} SOL`);
  if (bal < 0.5) {
    console.warn(`  ⚠ Low balance — run: solana airdrop 2 ${payer.publicKey.toBase58()} --url devnet`);
  }
}

// ---------- runners ----------
async function runMintList(connection, payer, { concurrent }) {
  const program = buildProgram(connection, payer);
  const umi = buildUmi(payer);

  // Minting is sequential (each needs its own blockhash + confirmation).
  console.log(`\n⛏  Minting ${COUNT} NFTs…`);
  const mints = [];
  for (let i = 1; i <= COUNT; i++) {
    const t = performance.now();
    try {
      const mintPk = await mintNft(umi, i);
      mints.push(mintPk);
      console.log(`  ✓ #${i} minted ${mintPk.toBase58()}  (${ms(performance.now() - t)})`);
    } catch (e) {
      console.log(`  ✗ #${i} mint failed: ${e.message}`);
    }
  }

  console.log(`\n🏷  Listing ${mints.length} NFTs  ${concurrent ? '(CONCURRENT)' : '(sequential)'}…`);
  let ok = 0;
  let fail = 0;
  const started = performance.now();
  if (concurrent) {
    const results = await Promise.allSettled(
      mints.map((m) => listNft(program, payer, m, randomPrice())),
    );
    for (const [i, r] of results.entries()) {
      if (r.status === 'fulfilled') {
        ok++;
        console.log(`  ✓ #${i + 1} listed  ${r.value.slice(0, 12)}…`);
      } else {
        fail++;
        console.log(`  ✗ #${i + 1} list failed: ${r.reason?.message ?? r.reason}`);
      }
    }
  } else {
    for (const [i, m] of mints.entries()) {
      const t = performance.now();
      try {
        const sig = await listNft(program, payer, m, randomPrice());
        ok++;
        console.log(`  ✓ #${i + 1} listed ${sig.slice(0, 12)}…  (${ms(performance.now() - t)})`);
      } catch (e) {
        fail++;
        console.log(`  ✗ #${i + 1} list failed: ${e.message}`);
      }
    }
  }

  const total = performance.now() - started;
  console.log(`\n📊 Listings: ${ok} ok / ${fail} failed  ·  ${ms(total)} total  ·  ${ms(total / Math.max(ok + fail, 1))}/tx avg`);
  console.log(`   Open the app's Browse page — the grid + Live activity should reflect all ${ok} on-chain.`);
}

async function runBuy(connection, payer) {
  const mintArg = flag('mint');
  if (!mintArg) throw new Error('buy mode needs --mint <MINT_ADDRESS>');
  const program = buildProgram(connection, payer);
  console.log(`\n💸 Buying ${mintArg} as ${payer.publicKey.toBase58()}…`);
  const sig = await buyNft(program, payer, new PublicKey(mintArg));
  console.log(`  ✓ purchased — sig ${sig}`);
}

async function main() {
  if (!['mint-list', 'concurrent-list', 'buy'].includes(mode)) {
    console.log('Usage: node scripts/stress-test.mjs <mint-list|concurrent-list|buy> [--count N] [--mint ADDR] [--keypair PATH]');
    process.exit(1);
  }
  const connection = new Connection(RPC, 'confirmed');
  const payer = loadKeypair(KEYPAIR_PATH);
  await preflight(connection, payer);

  if (mode === 'buy') await runBuy(connection, payer);
  else await runMintList(connection, payer, { concurrent: mode === 'concurrent-list' });

  console.log('\n✅ Done.\n');
}

main().catch((e) => {
  console.error(`\n❌ ${e.message}\n`);
  process.exit(1);
});
