import { describe, expect, it, vi } from 'vitest';
import { CoreAdapterWeb } from './coreAdapterWeb';
import { createWebAppState } from './webAppState';

describe('CoreAdapterWeb state and effects boundaries', () => {
  it('isolates in-memory state when a state instance is injected', async () => {
    const first = new CoreAdapterWeb({ state: createWebAppState() });
    const second = new CoreAdapterWeb({ state: createWebAppState() });

    await first.ledgerOpenAccount({
      name: 'Wallet',
      type: 'cash',
      currency: 'EUR',
    });

    await second.ledgerOpenAccount({
      name: 'Savings',
      type: 'cash',
      currency: 'USD',
    });

    await first.preferencesSetDefaultAccount({ accountId: 'first-default' });
    await second.preferencesSetDefaultAccount({ accountId: 'second-default' });

    await expect(first.ledgerListAccounts()).resolves.toMatchObject({
      items: [{ name: 'Wallet', currency: 'EUR' }],
    });
    await expect(second.ledgerListAccounts()).resolves.toMatchObject({
      items: [{ name: 'Savings', currency: 'USD' }],
    });
    await expect(first.preferencesGet()).resolves.toEqual({ defaultAccountId: 'first-default' });
    await expect(second.preferencesGet()).resolves.toEqual({ defaultAccountId: 'second-default' });
  });

  it('delegates backup downloads to the injected effect boundary', async () => {
    const downloadJson = vi.fn();
    const core = new CoreAdapterWeb({
      state: createWebAppState(),
      dependencies: {
        clock: { nowIso: () => '2026-05-26T10:11:12.123Z' },
        idGenerator: { nextId: () => 'fixed-id' },
        backupDownloader: { downloadJson },
      },
    });

    const result = await core.movementsExportBackup();

    expect(downloadJson).toHaveBeenCalledTimes(1);
    expect(downloadJson.mock.calls[0]?.[0]).toBe('gonezo-backup-2026-05-26T10-11-12Z.json');
    expect(JSON.parse(downloadJson.mock.calls[0]?.[1] ?? '{}')).toMatchObject({
      schemaVersion: 2,
      exportedAt: '2026-05-26T10:11:12.123Z',
      accounts: [],
      categories: [],
      tags: [],
      postedMovements: [],
    });
    expect(result).toMatchObject({
      fileName: 'gonezo-backup-2026-05-26T10-11-12Z.json',
      exportedAt: '2026-05-26T10:11:12.123Z',
      postedMovementCount: 0,
    });
  });
});
