import { useCallback, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import type { TransactionInstruction } from '@solana/web3.js';
import { sendAndConfirm } from '../lib/solana/tx';
import { mapTxError } from '../lib/solana/errors';
import { notify } from '../lib/notifications';
import { explorerUrl } from '../lib/config';
import type { TxStatus } from '../types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface SimulateOptions {
  pendingTitle: string;
  successTitle: string;
  successDescription?: string;
  /** Mutates the demo store; runs at the "confirmed" step. */
  apply: () => void;
}

export interface RunOptions {
  /** Toast title shown while the tx is in flight. */
  pendingTitle: string;
  /** Toast title shown on confirmation. */
  successTitle: string;
  successDescription?: string;
  /** Optional optimistic mutation; its returned fn is called to roll back on failure. */
  optimisticUpdate?: () => (() => void) | void;
  /** Called after confirmation (e.g. to invalidate queries). */
  onConfirmed?: (signature: string) => void;
  computeUnitLimit?: number;
}

/**
 * Generic transaction runner: builds nothing itself, but takes ready
 * instructions and owns signing, confirmation, the staged status tracker,
 * optimistic UI with rollback, and consistent success/error toasts.
 */
export function useTxRunner() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [status, setStatus] = useState<TxStatus>({ stage: 'idle' });

  const reset = useCallback(() => setStatus({ stage: 'idle' }), []);

  const run = useCallback(
    async (
      instructions: TransactionInstruction[],
      options: RunOptions,
    ): Promise<string | null> => {
      if (!wallet.connected || !wallet.publicKey) {
        notify({ variant: 'error', title: 'Connect a wallet first.' });
        return null;
      }

      const rollback = options.optimisticUpdate?.() ?? undefined;
      const pendingToast = notify;
      pendingToast({
        variant: 'pending',
        title: options.pendingTitle,
        description: 'Approve the transaction in your wallet…',
        duration: 4000,
      });

      try {
        setStatus({ stage: 'building' });
        const signature = await sendAndConfirm(connection, wallet, instructions, {
          computeUnitLimit: options.computeUnitLimit,
          onStage: (stage, sig) => setStatus({ stage, signature: sig }),
        });

        notify({
          variant: 'success',
          title: options.successTitle,
          description: options.successDescription,
          href: explorerUrl(signature),
        });
        options.onConfirmed?.(signature);
        return signature;
      } catch (err) {
        // Roll back optimistic state.
        if (typeof rollback === 'function') rollback();
        const friendly = mapTxError(err);
        setStatus({ stage: 'error', error: friendly.message });
        if (!friendly.isUserRejection) {
          notify({ variant: 'error', title: 'Transaction failed', description: friendly.message });
        } else {
          setStatus({ stage: 'idle' });
        }
        return null;
      }
    },
    [connection, wallet],
  );

  /**
   * Demo-mode counterpart to `run`: plays the same staged tx lifecycle
   * (building → sent → confirmed → finalized) with no wallet or chain, applying
   * the effect to the demo store at the confirmed step.
   */
  const simulate = useCallback(async (options: SimulateOptions): Promise<string> => {
    notify({ variant: 'pending', title: options.pendingTitle, duration: 1500 });
    setStatus({ stage: 'building' });
    const signature = 'DemoTx' + Math.random().toString(36).slice(2).padEnd(20, '0');
    await delay(250);
    setStatus({ stage: 'sent', signature });
    await delay(450);
    options.apply();
    setStatus({ stage: 'confirmed', signature });
    notify({
      variant: 'success',
      title: options.successTitle,
      description: options.successDescription,
    });
    await delay(300);
    setStatus({ stage: 'finalized', signature });
    return signature;
  }, []);

  return { status, run, simulate, reset };
}
