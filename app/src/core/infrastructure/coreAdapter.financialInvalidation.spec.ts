import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MacroAnalyticsInvalidationEffect, MacroAnalyticsInvalidationPort } from '../../macroAnalytics/application/macroAnalyticsInvalidation.port';
import { CoreAdapter } from './coreAdapter';
import { CoreAdapterWeb } from './coreAdapterWeb';

const invalidationFor = (implementation: (effect: MacroAnalyticsInvalidationEffect) => Promise<void> = async () => {}) => ({
  invalidate: vi.fn(implementation),
} satisfies MacroAnalyticsInvalidationPort);

describe('CoreAdapter macro analytics invalidation boundary', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses the posted movement policy after a successful expense', async () => {
    vi.spyOn(CoreAdapterWeb.prototype, 'ledgerRecordExpense').mockResolvedValue({ id: 'transaction' });
    const invalidation = invalidationFor();
    const adapter = new CoreAdapter(invalidation);
    const input = { accountId: 'account', occurredAt: '2025-04-03T11:00:00Z', amount: '20', currency: 'GBP' };

    await expect(adapter.ledgerRecordExpense(input)).resolves.toEqual({ id: 'transaction' });
    expect(invalidation.invalidate).toHaveBeenCalledWith({ kind: 'PERIOD_AND_FOLLOWING', effectiveAt: input.occurredAt });
  });

  it('uses the account policy after opening and deleting accounts', async () => {
    vi.spyOn(CoreAdapterWeb.prototype, 'ledgerOpenAccount').mockResolvedValue({ id: 'account' });
    vi.spyOn(CoreAdapterWeb.prototype, 'ledgerDeleteAccount').mockResolvedValue();
    const invalidation = invalidationFor();
    const adapter = new CoreAdapter(invalidation);
    const createdAt = '2026-01-01T00:00:00Z';

    await adapter.ledgerOpenAccount({ name: 'Cash', type: 'cash', currency: 'EUR', createdAt });
    await adapter.ledgerDeleteAccount({ accountId: 'account' });

    expect(invalidation.invalidate).toHaveBeenNthCalledWith(1, { kind: 'PERIOD_AND_FOLLOWING', effectiveAt: createdAt });
    expect(invalidation.invalidate).toHaveBeenNthCalledWith(2, { kind: 'ALL_PERIODS' });
  });

  it('does not invalidate when the operational mutation fails', async () => {
    vi.spyOn(CoreAdapterWeb.prototype, 'ledgerRecordExpense').mockRejectedValue(new Error('mutation failed'));
    const invalidation = invalidationFor();
    const adapter = new CoreAdapter(invalidation);

    await expect(adapter.ledgerRecordExpense({ accountId: 'account', occurredAt: '2025-04-03T11:00:00Z', amount: '20', currency: 'GBP' }))
      .rejects.toThrow('mutation failed');
    expect(invalidation.invalidate).not.toHaveBeenCalled();
  });

  it('preserves operational success when invalidation fails', async () => {
    vi.spyOn(CoreAdapterWeb.prototype, 'ledgerDeleteAccount').mockResolvedValue();
    const invalidation = invalidationFor(async () => { throw new Error('storage unavailable'); });
    const adapter = new CoreAdapter(invalidation);

    await expect(adapter.ledgerDeleteAccount({ accountId: 'account' })).resolves.toBeUndefined();
    expect(invalidation.invalidate).toHaveBeenCalledWith({ kind: 'ALL_PERIODS' });
  });

  it('uses structure, sharing, tag, recurrence, expected, and import policies', async () => {
    vi.spyOn(CoreAdapterWeb.prototype, 'ledgerReplacePostedTransactionItems').mockResolvedValue();
    vi.spyOn(CoreAdapterWeb.prototype, 'sharingRemoveMovementShare').mockResolvedValue();
    vi.spyOn(CoreAdapterWeb.prototype, 'orchestrationApplyTransactionTags').mockResolvedValue({ status: 'assigned', tagIds: ['tag'] });
    vi.spyOn(CoreAdapterWeb.prototype, 'schedulingCreateMovement').mockResolvedValue({ id: 'recurring' });
    vi.spyOn(CoreAdapterWeb.prototype, 'expectedCreateMovement').mockResolvedValue({ id: 'expected' });
    vi.spyOn(CoreAdapterWeb.prototype, 'mobillsImport').mockResolvedValue({ totalRows: 1, importedCount: 1, failedCount: 0, skippedCount: 0, rows: [] });
    const invalidation = invalidationFor();
    const adapter = new CoreAdapter(invalidation);

    await adapter.ledgerReplacePostedTransactionItems({ transactionId: 'posted-1', items: [] });
    await adapter.sharingRemoveMovementShare({ transactionId: 'posted-1' });
    await adapter.orchestrationApplyTransactionTags({ transactionId: 'posted-1', tagNames: ['Travel'] });
    await adapter.schedulingCreateMovement({ type: 'expense', sourceAccountId: 'account', amount: '10', currency: 'GBP', rule: { frequency: 'monthly' }, recurrenceEnd: { kind: 'never' }, startAt: '2026-01-01', zoneId: 'UTC' });
    await adapter.expectedCreateMovement({ accountId: 'account', type: 'expense', expectedAt: '2026-02-01', amount: '10', currency: 'GBP' });
    await adapter.mobillsImport({ fileBase64: 'e30=' });

    expect(invalidation.invalidate).toHaveBeenNthCalledWith(1, { kind: 'ALL_PERIODS' });
    expect(invalidation.invalidate).toHaveBeenNthCalledWith(2, { kind: 'ALL_PERIODS' });
    expect(invalidation.invalidate).toHaveBeenNthCalledWith(3, { kind: 'ALL_PERIODS' });
    expect(invalidation.invalidate).toHaveBeenNthCalledWith(4, { kind: 'CURRENT_PERIOD' });
    expect(invalidation.invalidate).toHaveBeenNthCalledWith(5, { kind: 'EXACT_PERIOD', effectiveAt: '2026-02-01' });
    expect(invalidation.invalidate).toHaveBeenNthCalledWith(6, { kind: 'ALL_PERIODS' });
  });

  it('does not invalidate presentation-only changes or failed tag assignments', async () => {
    vi.spyOn(CoreAdapterWeb.prototype, 'sharingRenamePerson').mockResolvedValue();
    vi.spyOn(CoreAdapterWeb.prototype, 'orchestrationApplyTransactionTags').mockResolvedValue({ status: 'failed', errorCode: 'ASSIGNMENT_FAILED' });
    const invalidation = invalidationFor();
    const adapter = new CoreAdapter(invalidation);

    await adapter.sharingRenamePerson({ personId: 'person', displayName: 'New name' });
    await adapter.orchestrationApplyTransactionTags({ transactionId: 'posted', tagNames: ['Travel'] });

    expect(invalidation.invalidate).not.toHaveBeenCalled();
  });
});
