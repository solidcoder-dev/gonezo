import { afterEach, describe, expect, it, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { CoreAdapterWeb } from '../../core/infrastructure/coreAdapterWeb';
import { createWebAppState } from '../../core/infrastructure/webAppState';
import { createAuthenticationService } from './createAuthenticationService';

describe('authentication setup and existing application data', () => {
  afterEach(() => vi.restoreAllMocks());
  it('preserves existing core data while creating local credentials', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    const core = new CoreAdapterWeb({
      state: createWebAppState(),
      dependencies: {
        clock: { nowIso: () => '2026-01-01T00:00:00Z' },
        idGenerator: { nextId: (() => { let id = 0; return () => `id-${++id}`; })() },
        backupDownloader: { downloadJson: vi.fn() },
      },
    });
    const account = await core.ledgerOpenAccount({ name: 'Everyday', type: 'cash', currency: 'EUR' });
    await core.ledgerRecordExpense({ accountId: account.id, occurredAt: '2026-01-01T00:00:00Z', amount: '18.50', currency: 'EUR', description: 'Groceries' });
    const accountsBefore = await core.ledgerListAccounts();
    const movementsBefore = await core.ledgerListTransactions({ accountId: account.id });

    await createAuthenticationService().setupCredentials('alice', 'correct-horse-battery');

    await expect(core.ledgerListAccounts()).resolves.toEqual(accountsBefore);
    await expect(core.ledgerListTransactions({ accountId: account.id })).resolves.toEqual(movementsBefore);
  });
});
