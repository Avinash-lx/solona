import {
  type Connection,
  type PublicKey,
  type TransactionInstruction,
  Transaction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';

export interface SendOptions {
  /** Called as the tx moves through its lifecycle so the UI can render a tracker. */
  onStage?: (stage: 'building' | 'sent' | 'confirmed' | 'finalized', signature?: string) => void;
  /** Extra compute units (some token-program CPIs need a bump). */
  computeUnitLimit?: number;
}

/**
 * Build, sign, send and confirm a transaction from raw instructions, reporting
 * each lifecycle stage. We confirm to `confirmed` for snappy UX, then upgrade
 * to `finalized` in the background so the tracker can show the final state.
 */
export async function sendAndConfirm(
  connection: Connection,
  wallet: WalletContextState,
  instructions: TransactionInstruction[],
  options: SendOptions = {},
): Promise<string> {
  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected');
  }

  options.onStage?.('building');

  const tx = new Transaction();
  if (options.computeUnitLimit) {
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: options.computeUnitLimit }));
  }
  tx.add(...instructions);

  const latest = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = latest.blockhash;
  tx.feePayer = wallet.publicKey;

  // wallet-adapter handles signing + sending in one call.
  const signature = await wallet.sendTransaction(tx, connection, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });
  options.onStage?.('sent', signature);

  const confirmed = await connection.confirmTransaction(
    { signature, ...latest },
    'confirmed',
  );
  if (confirmed.value.err) {
    throw new Error(`Transaction failed on-chain: ${JSON.stringify(confirmed.value.err)}`);
  }
  options.onStage?.('confirmed', signature);

  // Upgrade to finalized in the background; do not block the UI on it.
  void connection
    .confirmTransaction({ signature, ...latest }, 'finalized')
    .then((res) => {
      if (!res.value.err) options.onStage?.('finalized', signature);
    })
    .catch(() => {
      /* finalization tracking is best-effort */
    });

  return signature;
}

/** Fetch a wallet's SOL balance in lamports, tolerant of RPC hiccups. */
export async function fetchBalance(
  connection: Connection,
  owner: PublicKey,
): Promise<number> {
  return connection.getBalance(owner, 'confirmed');
}
