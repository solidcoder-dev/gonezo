import { describe, expect, it } from 'vitest';
import { ApplicationBackupError, applyWebApplicationBackup, exportWebApplicationBackup, validateWebApplicationBackup } from './webApplicationBackup';
import { createWebAppState } from '../../core/infrastructure/webAppState';
import { CoreAdapterWeb } from '../../core/infrastructure/coreAdapterWeb';

describe('web application backup', () => {
  it('round-trips all portable state with deterministic section ordering', () => {
    const state = createWebAppState({
      ledgerAccounts: [{ id: 'account-2', name: 'Savings', type: 'cash', currency: 'EUR', status: 'active', createdAt: '2026-01-02T00:00:00Z' }, { id: 'account-1', name: 'Main', type: 'cash', currency: 'EUR', status: 'active', createdAt: '2026-01-01T00:00:00Z' }],
      taxonomyCategories: [{ id: 'category-1', name: 'Food', normalizedName: 'food', appliesTo: 'expense', status: 'active', createdAt: '2026-01-01T00:00:00Z' }],
      taxonomyTags: [{ id: 'tag-1', name: 'Home', normalizedName: 'home', status: 'active', createdAt: '2026-01-01T00:00:00Z' }],
      taxonomyTransactionTags: new Map([['movement-1', ['tag-1']]]),
      ledgerTransactions: [{ id: 'movement-1', accountId: 'account-1', type: 'expense', status: 'posted', amount: '12.30', currency: 'EUR', occurredAt: '2026-01-03T00:00:00Z', categoryId: 'category-1', items: [{ id: 'item-1', name: 'Lunch', amount: '12.30', currency: 'EUR', categoryId: 'category-1' }] }],
      defaultAccountId: 'account-1',
    });
    const backup = exportWebApplicationBackup(state, '2026-02-01T00:00:00Z');
    const restored = createWebAppState();

    applyWebApplicationBackup(restored, validateWebApplicationBackup(JSON.parse(JSON.stringify(backup))));

    expect(restored.ledgerAccounts).toEqual([...state.ledgerAccounts].sort((left, right) => left.id.localeCompare(right.id)));
    expect(restored.ledgerTransactions).toEqual(state.ledgerTransactions);
    expect(restored.taxonomyTransactionTags).toEqual(state.taxonomyTransactionTags);
    expect(restored.defaultAccountId).toBe('account-1');
    expect(backup.sections.ledger.data.accounts.map((item) => (item as { id: string }).id)).toEqual(['account-1', 'account-2']);
  });

  it('rejects a movement with a missing account before applying state', () => {
    const state = createWebAppState({ defaultAccountId: 'existing' });
    const backup = exportWebApplicationBackup(createWebAppState(), '2026-02-01T00:00:00Z');
    (backup.sections.ledger.data.postedMovements as Array<Record<string, unknown>>).push({ id: 'movement-1', accountId: 'missing', type: 'expense', status: 'posted', amount: '1.00', currency: 'EUR', occurredAt: '2026-01-01T00:00:00Z', tagIds: [], splitItems: [] });

    expect(() => validateWebApplicationBackup(backup)).toThrow('movement account');
    expect(state.defaultAccountId).toBe('existing');
  });

  it('rejects unsupported root and section versions explicitly', () => {
    const backup = exportWebApplicationBackup(createWebAppState(), '2026-02-01T00:00:00Z');

    expect(() => validateWebApplicationBackup({ ...backup, formatVersion: 2 })).toThrow(/format or version/);
    expect(() => validateWebApplicationBackup({ ...backup, sections: { ...backup.sections, ledger: { ...backup.sections.ledger, version: 2 } } })).toThrow(/ledger/);
  });

  it('reports malformed JSON as an application backup error', async () => {
    const core = new CoreAdapterWeb({ state: createWebAppState() });

    await expect(core.applicationImportBackup({ fileBase64: btoa('{broken') })).rejects.toMatchObject({ message: 'Invalid application backup JSON' });
    expect(() => validateWebApplicationBackup({ format: 'gonezo-backup', formatVersion: 2 })).toThrow(ApplicationBackupError);
  });

  it('keeps canonical portable content after import and re-export', () => {
    const source = createWebAppState({ defaultAccountId: 'account-1' });
    source.ledgerAccounts.push({ id: 'account-1', name: 'Main', type: 'cash', currency: 'EUR', status: 'active', createdAt: '2026-01-01T00:00:00Z' });
    const first = exportWebApplicationBackup(source, '2026-02-01T00:00:00Z');
    const restored = createWebAppState();
    applyWebApplicationBackup(restored, validateWebApplicationBackup(JSON.parse(JSON.stringify(first))));
    const second = exportWebApplicationBackup(restored, '2027-02-01T00:00:00Z');

    expect({ ...second, createdAt: '<normalized>' }).toEqual({ ...first, createdAt: '<normalized>' });
  });
});
