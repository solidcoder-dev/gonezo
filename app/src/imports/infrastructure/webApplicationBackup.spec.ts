import { describe, expect, it } from 'vitest';
import { ApplicationBackupError, applyWebApplicationBackup, exportWebApplicationBackup, validateWebApplicationBackup } from './webApplicationBackup';
import { createWebAppState } from '../../core/infrastructure/webAppState';
import { CoreAdapterWeb } from '../../core/infrastructure/coreAdapterWeb';
import canonicalFixture from './fixtures/application-backup-v1.json';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

  it('accepts the legacy Kotlin section field names from existing backups', () => {
    const backup = exportWebApplicationBackup(createWebAppState(), '2026-02-01T00:00:00Z') as any;
    backup.sections.sharing.data.recurringPlans = backup.sections.sharing.data.recurringSharingPlans;
    backup.sections.sharing.data.plannedShares = backup.sections.sharing.data.plannedExpenseShares;
    delete backup.sections.sharing.data.recurringSharingPlans;
    delete backup.sections.sharing.data.plannedExpenseShares;
    backup.sections.ledger.data.movements = backup.sections.ledger.data.postedMovements;
    delete backup.sections.ledger.data.postedMovements;

    expect(() => validateWebApplicationBackup(backup)).not.toThrow();
  });

  it('rejects a source template item that belongs to another recurring movement', () => {
    const backup = exportWebApplicationBackup(createWebAppState({
      ledgerAccounts: [{ id: 'account-1', name: 'Main', type: 'cash', currency: 'EUR', status: 'active', createdAt: '2026-01-01T00:00:00Z' }],
      recurringMovements: [
        { id: 'recurring-1', sourceAccountId: 'account-1', splitItems: [{ id: 'template-1', name: 'One', amount: '1.00' }] } as any,
        { id: 'recurring-2', sourceAccountId: 'account-1', splitItems: [{ id: 'template-2', name: 'Two', amount: '1.00' }] } as any,
      ],
      expectedMovements: [{ id: 'expected-1', accountId: 'account-1', originRecurringMovementId: 'recurring-1', splitItems: [{ id: 'expected-item-1', name: 'One', amount: '1.00', sourceTemplateItemId: 'template-2' }] } as any],
    }), '2026-02-01T00:00:00Z');

    expect(() => validateWebApplicationBackup(backup)).toThrow(/source template item/);
  });

  it('allows identifiers reused by different persistence tables', () => {
    const backup = exportWebApplicationBackup(createWebAppState({
      ledgerAccounts: [{ id: 'account-1', name: 'Main', type: 'cash', currency: 'EUR', status: 'active', createdAt: '2026-01-01T00:00:00Z' }],
      ledgerTransactions: [{ id: 'same-id', accountId: 'account-1', type: 'expense', status: 'posted', amount: '1.00', currency: 'EUR', occurredAt: '2026-01-01T00:00:00Z', items: [] }],
      recurringMovements: [{ id: 'same-id', sourceAccountId: 'account-1' } as any],
    }), '2026-02-01T00:00:00Z');

    expect(() => validateWebApplicationBackup(backup)).not.toThrow();
  });

  it('rejects unknown sections instead of silently dropping them', () => {
    const backup = exportWebApplicationBackup(createWebAppState(), '2026-02-01T00:00:00Z') as any;
    backup.sections.futureUnknownSection = { version: 1, data: {} };

    expect(() => validateWebApplicationBackup(backup)).toThrow(/unknown|unsupported/i);
  });

  it('accepts a v1 backup when the current capability set knows a future section', () => {
    expect(() => validateWebApplicationBackup(canonicalFixture, {
      formatRegistry: [
        { version: 1, requiredSections: ['taxonomy', 'ledger', 'recurrence', 'expected', 'sharing', 'analytics', 'preferences'] },
        { version: 2, requiredSections: ['taxonomy', 'ledger', 'recurrence', 'expected', 'sharing', 'analytics', 'preferences', 'budgets'] },
      ],
    })).not.toThrow();
  });

  it('rejects a v2 backup that is missing its required future section', () => {
    expect(() => validateWebApplicationBackup({ ...canonicalFixture, formatVersion: 2 }, {
      formatRegistry: [{ version: 2, requiredSections: ['taxonomy', 'ledger', 'recurrence', 'expected', 'sharing', 'analytics', 'preferences', 'budgets'] }],
    })).toThrow(/missing.*budgets/i);
  });

  it('rejects a future section when no section capability is registered', () => {
    const backup = { ...canonicalFixture, formatVersion: 2, sections: { ...canonicalFixture.sections, budgets: { version: 1, data: {} } } } as any;
    expect(() => validateWebApplicationBackup(backup, {
      formatRegistry: [{ version: 2, requiredSections: ['taxonomy', 'ledger', 'recurrence', 'expected', 'sharing', 'analytics', 'preferences', 'budgets'] }],
    })).toThrow(/budgets/i);
  });

  it('accepts a future section when its capability and version are registered', () => {
    const backup = { ...canonicalFixture, formatVersion: 2, sections: { ...canonicalFixture.sections, budgets: { version: 1, data: {} } } } as any;
    expect(() => validateWebApplicationBackup(backup, {
      formatRegistry: [{ version: 2, requiredSections: ['taxonomy', 'ledger', 'recurrence', 'expected', 'sharing', 'analytics', 'preferences', 'budgets'] }],
      supportedSectionVersions: { taxonomy: [1], ledger: [1], recurrence: [1], expected: [1], sharing: [1], analytics: [1], preferences: [1], budgets: [1] },
    })).not.toThrow();
  });

  it('keeps section versions independent from the root format version', () => {
    const sharingV2 = { ...canonicalFixture, sections: { ...canonicalFixture.sections, sharing: { ...canonicalFixture.sections.sharing, version: 2 } } } as any;
    expect(() => validateWebApplicationBackup(sharingV2, { supportedSectionVersions: { taxonomy: [1], ledger: [1], recurrence: [1], expected: [1], sharing: [1, 2], analytics: [1], preferences: [1] } })).not.toThrow();
  });

  it('decodes the canonical all-section fixture', () => {
    const document = validateWebApplicationBackup(canonicalFixture);

    expect(Object.keys(document.sections)).toEqual(['taxonomy', 'ledger', 'recurrence', 'expected', 'sharing', 'analytics', 'preferences']);
    const movement = document.sections.ledger.data.postedMovements[0] as any;
    const recurring = (document.sections.recurrence.data.movements as any[])[0] as any;
    const expected = (document.sections.expected.data.movements as any[])[0] as any;
    const sharing = document.sections.sharing.data as any;
    expect(movement.accountId).toBe((document.sections.ledger.data.accounts as any[])[0].id);
    expect(movement.categoryId).toBe((document.sections.taxonomy.data.categories as any[])[0].id);
    expect(movement.tagIds).toContain((document.sections.taxonomy.data.tags as any[])[0].id);
    expect(movement.splitItems).toHaveLength(2);
    expect(movement.splitItems.every((item: any) => item.categoryId === movement.categoryId)).toBe(true);
    expect(expected.originRecurringMovementId).toBe(recurring.id);
    expect(expected.splitItems[0].sourceTemplateItemId).toBe(recurring.splitItems[0].id);
    expect(sharing.expenseShares[0].transactionId).toBe(movement.id);
    expect(sharing.plannedExpenseShares[0].expectedMovementId).toBe(expected.id);
    expect(sharing.recurringSharingPlans[0].recurringMovementId).toBe(recurring.id);
    expect((document.sections.preferences.data as any).defaultAccountId).toBe(movement.accountId);
  });

  it('keeps the Web canonical fixture semantically identical to Kotlin', () => {
    const kotlinFixture = JSON.parse(readFileSync(resolve(process.cwd(), '../core/src/test/resources/application-backup-v1.json'), 'utf8'));
    expect(canonicalize(canonicalFixture)).toEqual(canonicalize(kotlinFixture));
  });

  it('round-trips the complete portable state through public Web backup operations', () => {
    const source = createWebAppState({
      ledgerAccounts: [{ id: 'account-1', name: 'Main', type: 'cash', currency: 'EUR', status: 'active', createdAt: '2026-01-01T00:00:00Z' }],
      taxonomyCategories: [{ id: 'category-1', name: 'Food', normalizedName: 'food', appliesTo: 'expense', status: 'active', createdAt: '2026-01-01T00:00:00Z' }],
      taxonomyTags: [{ id: 'tag-1', name: 'Home', normalizedName: 'home', status: 'active', createdAt: '2026-01-01T00:00:00Z' }],
      taxonomyTransactionTags: new Map([['movement-1', ['tag-1']]]),
      ledgerTransactions: [{ id: 'movement-1', accountId: 'account-1', type: 'expense', status: 'posted', amount: '12.30', currency: 'EUR', occurredAt: '2026-01-02T00:00:00Z', categoryId: 'category-1', items: [{ id: 'item-1', name: 'Lunch', amount: '12.30', currency: 'EUR', categoryId: 'category-1' }] }],
      recurringMovements: [{ id: 'recurring-1', sourceAccountId: 'account-1', splitItems: [{ id: 'template-1', name: 'Lunch', amount: '12.30' }] } as any],
      recurringMovementOccurrences: [{ id: 'occurrence-1', recurringMovementId: 'recurring-1', dueAt: '2026-01-03T00:00:00Z' }],
      expectedMovements: [{ id: 'expected-1', accountId: 'account-1', originRecurringMovementId: 'recurring-1', splitItems: [{ id: 'expected-item-1', name: 'Lunch', amount: '12.30', sourceTemplateItemId: 'template-1' }] } as any],
      sharingPersons: [{ id: 'person-1', name: 'Alex', normalizedName: 'alex', createdAt: '2026-01-01T00:00:00Z' }],
      expenseShares: [{ id: 'share-1', transactionId: 'movement-1', payerPersonId: 'person-1', totalAmount: '12.30', currency: 'EUR', participants: [{ participantId: 'participant-1', personId: 'person-1', amount: '12.30', reimbursable: false }], createdAt: '2026-01-02T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' }],
      recurringSharingPlans: [{ id: 'plan-1', recurringMovementId: 'recurring-1', payerPersonId: 'person-1', mode: 'parts', currency: 'EUR', participants: [{ id: 'plan-participant-1', personId: 'person-1', parts: 1, reimbursable: false, order: 0 }], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }],
      plannedExpenseShares: [{ id: 'planned-1', expectedMovementId: 'expected-1', sourcePlanId: 'plan-1', payerPersonId: 'person-1', mode: 'parts', totalAmount: '12.30', currency: 'EUR', participants: [{ id: 'planned-participant-1', personId: 'person-1', parts: 1, amount: '12.30', reimbursable: false, order: 0 }], status: 'pending', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }],
      analyticsExclusions: [{ id: 'exclusion-1', scopeType: 'movement', scopeId: 'movement-1', reason: 'user_ignored', createdAt: '2026-01-02T00:00:00Z' }],
      defaultAccountId: 'account-1',
    });
    const first = exportWebApplicationBackup(source, '2026-02-01T00:00:00Z');
    const restored = createWebAppState();
    applyWebApplicationBackup(restored, validateWebApplicationBackup(first));
    const second = exportWebApplicationBackup(restored, '2027-02-01T00:00:00Z');

    expect({ ...second, createdAt: '<normalized>' }).toEqual({ ...first, createdAt: '<normalized>' });
  });
});

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => [key, canonicalize(entry)]));
  }
  return value;
}
