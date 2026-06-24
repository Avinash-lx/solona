import { AnchorProvider, BN, Program } from '@coral-xyz/anchor';
import type { Idl } from '@coral-xyz/anchor';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  Connection,
  PublicKey,
  SystemProgram,
  type TransactionInstruction,
} from '@solana/web3.js';
import { IDL } from './idl';
import {
  findListingPda,
  findMarketplacePda,
  findTreasuryPda,
  findVaultPda,
} from './pdas';
import { config } from '../config';

/** Minimal wallet shape the provider needs (matches wallet-adapter). */
export interface AnchorWalletLike {
  publicKey: PublicKey;
  signTransaction: AnchorProvider['wallet']['signTransaction'];
  signAllTransactions: AnchorProvider['wallet']['signAllTransactions'];
}

/**
 * A read-only wallet used when no wallet is connected. It can never sign, so
 * any attempt to send a tx fails loudly rather than silently — read paths
 * (fetching/decoding accounts) work fine without a connected wallet.
 */
const READONLY_KEY = new PublicKey('11111111111111111111111111111111');

function readonlyWallet(): AnchorWalletLike {
  return {
    publicKey: READONLY_KEY,
    signTransaction: async () => {
      throw new Error('Wallet not connected');
    },
    signAllTransactions: async () => {
      throw new Error('Wallet not connected');
    },
  };
}

export function getProvider(
  connection: Connection,
  wallet?: AnchorWalletLike,
): AnchorProvider {
  return new AnchorProvider(connection, wallet ?? readonlyWallet(), {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });
}

export function getProgram(
  connection: Connection,
  wallet?: AnchorWalletLike,
): Program<Idl> {
  const provider = getProvider(connection, wallet);
  return new Program(IDL, provider);
}

/**
 * High-level builder around the Anchor program. Every method returns a bare
 * `TransactionInstruction` so hooks own tx assembly, signing, and confirmation.
 * PDAs are derived here (single source of truth) and never trusted from the UI.
 */
export class MarketplaceClient {
  readonly program: Program<Idl>;
  readonly marketplace: PublicKey;
  readonly treasury: PublicKey;

  constructor(
    connection: Connection,
    wallet?: AnchorWalletLike,
    marketplaceName: string = config.marketplaceName,
  ) {
    this.program = getProgram(connection, wallet);
    [this.marketplace] = findMarketplacePda(marketplaceName);
    [this.treasury] = findTreasuryPda(this.marketplace);
  }

  async initializeMarketplaceIx(
    authority: PublicKey,
    name: string,
    feeBps: number,
  ): Promise<TransactionInstruction> {
    const [marketplace] = findMarketplacePda(name);
    const [treasury] = findTreasuryPda(marketplace);
    return this.program.methods
      .initializeMarketplace(name, feeBps)
      .accountsPartial({
        marketplace,
        treasury,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  async listNftIx(
    seller: PublicKey,
    nftMint: PublicKey,
    priceLamports: number | BN,
  ): Promise<TransactionInstruction> {
    const [listing] = findListingPda(this.marketplace, nftMint);
    const [vault] = findVaultPda(this.marketplace, nftMint);
    const sellerTokenAccount = getAssociatedTokenAddressSync(nftMint, seller);
    return this.program.methods
      .listNft(new BN(priceLamports.toString()))
      .accountsPartial({
        marketplace: this.marketplace,
        listing,
        seller,
        nftMint,
        sellerTokenAccount,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  async purchaseNftIx(
    buyer: PublicKey,
    seller: PublicKey,
    nftMint: PublicKey,
  ): Promise<TransactionInstruction> {
    const [listing] = findListingPda(this.marketplace, nftMint);
    const [vault] = findVaultPda(this.marketplace, nftMint);
    const buyerTokenAccount = getAssociatedTokenAddressSync(nftMint, buyer);
    return this.program.methods
      .purchaseNft()
      .accountsPartial({
        marketplace: this.marketplace,
        listing,
        buyer,
        seller,
        treasury: this.treasury,
        nftMint,
        vault,
        buyerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  async delistNftIx(
    seller: PublicKey,
    nftMint: PublicKey,
  ): Promise<TransactionInstruction> {
    const [listing] = findListingPda(this.marketplace, nftMint);
    const [vault] = findVaultPda(this.marketplace, nftMint);
    const sellerTokenAccount = getAssociatedTokenAddressSync(nftMint, seller);
    return this.program.methods
      .delistNft()
      .accountsPartial({
        marketplace: this.marketplace,
        listing,
        seller,
        nftMint,
        vault,
        sellerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
  }

  async updateFeeIx(
    authority: PublicKey,
    feeBps: number,
  ): Promise<TransactionInstruction> {
    return this.program.methods
      .updateFee(feeBps)
      .accountsPartial({
        marketplace: this.marketplace,
        authority,
      })
      .instruction();
  }
}
