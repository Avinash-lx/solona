import { describe, expect, it } from 'vitest';
import { Connection } from '@solana/web3.js';
import { MarketplaceClient, MarketplaceNotReadyError } from './program';
import { findMarketplacePda } from './pdas';
import { config } from '../config';

// No network calls happen here: Connection is lazy and we never send a tx.
const connection = new Connection('http://localhost:8899');

describe('MarketplaceClient program ID', () => {
  it('targets config.programId (single source of truth, not the bundled idl.address)', () => {
    const client = new MarketplaceClient(connection);
    expect(client.program.programId.toBase58()).toBe(config.programId.toBase58());
  });

  it('derives PDAs against the same program ID the instructions target', () => {
    const client = new MarketplaceClient(connection, undefined, 'unit-test-market');
    const [expected] = findMarketplacePda('unit-test-market', client.program.programId);
    expect(client.marketplace.toBase58()).toBe(expected.toBase58());
  });
});

describe('MarketplaceNotReadyError', () => {
  it('is identifiable across the trade hooks', () => {
    const err = new MarketplaceNotReadyError('nope');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('MarketplaceNotReadyError');
  });
});
