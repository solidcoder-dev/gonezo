import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FinancialDataChangeObserver } from '../../macroAnalytics/application/financialDataChangeObserver.port';
import { CoreAdapter } from './coreAdapter';
import { CoreAdapterWeb } from './coreAdapterWeb';

describe('CoreAdapter financial invalidation boundary', () => {
  afterEach(() => vi.restoreAllMocks());

  it('persists an exact affected period only after a posted transaction succeeds', async () => {
    const record = vi.spyOn(CoreAdapterWeb.prototype, 'ledgerRecordExpense').mockResolvedValue({ id: 'transaction' });
    const observer: FinancialDataChangeObserver = {
      periodChanged: vi.fn(async () => {}),
      periodAndFollowingChanged: vi.fn(async () => {}),
      currentPeriodChanged: vi.fn(async () => {}),
      allPeriodsChanged: vi.fn(async () => {}),
    };
    const adapter = new CoreAdapter(observer);
    const input = { accountId: 'account', occurredAt: '2025-04-03T11:00:00Z', amount: '20', currency: 'GBP' };

    await expect(adapter.ledgerRecordExpense(input)).resolves.toEqual({ id: 'transaction' });

    expect(record).toHaveBeenCalledWith(input);
    expect(observer.periodAndFollowingChanged).toHaveBeenCalledWith(input.occurredAt);
  });

  it('invalidates balance snapshots after creating a zero-balance account', async () => {
    const open = vi.spyOn(CoreAdapterWeb.prototype, 'ledgerOpenAccount').mockResolvedValue({ id: 'account' });
    const observer: FinancialDataChangeObserver = {
      periodChanged: vi.fn(async () => {}),
      periodAndFollowingChanged: vi.fn(async () => {}),
      currentPeriodChanged: vi.fn(async () => {}),
      allPeriodsChanged: vi.fn(async () => {}),
    };
    const adapter = new CoreAdapter(observer);
    const input = { name: 'Cash', type: 'cash' as const, currency: 'EUR', createdAt: '2026-01-01T00:00:00Z' };

    await expect(adapter.ledgerOpenAccount(input)).resolves.toEqual({ id: 'account' });

    expect(open).toHaveBeenCalledWith(input);
    expect(observer.periodAndFollowingChanged).toHaveBeenCalledWith(input.createdAt);
  });

  it('invalidates all financial periods after successful account deletion', async () => {
    const deletion = vi.spyOn(CoreAdapterWeb.prototype, 'ledgerDeleteAccount').mockResolvedValue();
    const observer: FinancialDataChangeObserver = {
      periodChanged: vi.fn(async () => {}),
      periodAndFollowingChanged: vi.fn(async () => {}),
      currentPeriodChanged: vi.fn(async () => {}),
      allPeriodsChanged: vi.fn(async () => {}),
    };
    const adapter = new CoreAdapter(observer);
    const input = { accountId: 'account' };

    await adapter.ledgerDeleteAccount(input);

    expect(deletion).toHaveBeenCalledWith(input);
    expect(observer.allPeriodsChanged).toHaveBeenCalledOnce();
  });

  it('preserves account deletion success when invalidation fails', async () => {
    vi.spyOn(CoreAdapterWeb.prototype, 'ledgerDeleteAccount').mockResolvedValue();
    const observer: FinancialDataChangeObserver = {
      periodChanged: vi.fn(async () => {}),
      periodAndFollowingChanged: vi.fn(async () => {}),
      currentPeriodChanged: vi.fn(async () => {}),
      allPeriodsChanged: vi.fn(async () => { throw new Error('storage unavailable'); }),
    };
    const adapter = new CoreAdapter(observer);

    await expect(adapter.ledgerDeleteAccount({ accountId: 'account' })).resolves.toBeUndefined();
  });

  it('does not enqueue rebuild work after the financial mutation fails', async () => {
    vi.spyOn(CoreAdapterWeb.prototype, 'ledgerRecordExpense').mockRejectedValue(new Error('mutation failed'));
    const observer: FinancialDataChangeObserver = {
      periodChanged: vi.fn(async () => {}),
      periodAndFollowingChanged: vi.fn(async () => {}),
      currentPeriodChanged: vi.fn(async () => {}),
      allPeriodsChanged: vi.fn(async () => {}),
    };
    const adapter = new CoreAdapter(observer);

    await expect(adapter.ledgerRecordExpense({ accountId: 'account', occurredAt: '2025-04-03T11:00:00Z', amount: '20', currency: 'GBP' }))
      .rejects.toThrow('mutation failed');

    expect(observer.periodAndFollowingChanged).not.toHaveBeenCalled();
    expect(observer.periodChanged).not.toHaveBeenCalled();
  });

  it('keeps financial success when optional rebuild persistence fails', async () => {
    vi.spyOn(CoreAdapterWeb.prototype, 'ledgerRecordExpense').mockResolvedValue({ id: 'transaction' });
    const observer: FinancialDataChangeObserver = {
      periodChanged: vi.fn(async () => {}),
      periodAndFollowingChanged: vi.fn(async () => { throw new Error('storage unavailable'); }),
      currentPeriodChanged: vi.fn(async () => {}),
      allPeriodsChanged: vi.fn(async () => {}),
    };
    const adapter = new CoreAdapter(observer);

    await expect(adapter.ledgerRecordExpense({ accountId: 'account', occurredAt: '2025-04-03T11:00:00Z', amount: '20', currency: 'GBP' }))
      .resolves.toEqual({ id: 'transaction' });
  });

  it('invalidates all periods after posted split items or categories change', async () => {
    const replace = vi.spyOn(CoreAdapterWeb.prototype, 'ledgerReplacePostedTransactionItems').mockResolvedValue();
    const observer: FinancialDataChangeObserver = {
      periodChanged: vi.fn(async () => {}),
      periodAndFollowingChanged: vi.fn(async () => {}),
      currentPeriodChanged: vi.fn(async () => {}),
      allPeriodsChanged: vi.fn(async () => {}),
    };
    const adapter = new CoreAdapter(observer);
    const input = { transactionId: 'posted-1', items: [] };

    await adapter.ledgerReplacePostedTransactionItems(input);

    expect(replace).toHaveBeenCalledWith(input);
    expect(observer.allPeriodsChanged).toHaveBeenCalledOnce();
  });

  it('invalidates Sharing changes after apply, replace, and removal succeed', async () => {
    vi.spyOn(CoreAdapterWeb.prototype, 'sharingApplyShareToPostedMovement').mockResolvedValue({ shareId: 'share', transactionId: 'posted', participants: [] });
    vi.spyOn(CoreAdapterWeb.prototype, 'sharingReplaceMovementShare').mockResolvedValue({ shareId: 'share', transactionId: 'posted' });
    vi.spyOn(CoreAdapterWeb.prototype, 'sharingRemoveMovementShare').mockResolvedValue();
    const observer: FinancialDataChangeObserver = {
      periodChanged: vi.fn(async () => {}),
      periodAndFollowingChanged: vi.fn(async () => {}),
      currentPeriodChanged: vi.fn(async () => {}),
      allPeriodsChanged: vi.fn(async () => {}),
    };
    const adapter = new CoreAdapter(observer);

    await adapter.sharingApplyShareToPostedMovement({ transactionId: 'posted', payer: { currentUser: true }, participants: [] });
    await adapter.sharingReplaceMovementShare({ transactionId: 'posted', payer: { currentUser: true }, participants: [] });
    await adapter.sharingRemoveMovementShare({ transactionId: 'posted' });

    expect(observer.allPeriodsChanged).toHaveBeenCalledTimes(3);
  });

  it('does not invalidate Macro Analytics after person presentation data changes', async () => {
    vi.spyOn(CoreAdapterWeb.prototype, 'sharingRenamePerson').mockResolvedValue();
    const observer: FinancialDataChangeObserver = {
      periodChanged: vi.fn(async () => {}),
      periodAndFollowingChanged: vi.fn(async () => {}),
      currentPeriodChanged: vi.fn(async () => {}),
      allPeriodsChanged: vi.fn(async () => {}),
    };
    const adapter = new CoreAdapter(observer);

    await adapter.sharingRenamePerson({ personId: 'person', displayName: 'New name' });

    expect(observer.allPeriodsChanged).not.toHaveBeenCalled();
    expect(observer.periodAndFollowingChanged).not.toHaveBeenCalled();
    expect(observer.periodChanged).not.toHaveBeenCalled();
    expect(observer.currentPeriodChanged).not.toHaveBeenCalled();
  });

  it('invalidates the current period after scheduled materialization processes expected and posted occurrences', async () => {
    vi.spyOn(CoreAdapterWeb.prototype, 'schedulingProcessDueMovements').mockResolvedValue({
      scanned: 1,
      posted: 1,
      expectedCreated: 0,
      failed: 0,
      advancedSchedules: 1,
    });
    const observer: FinancialDataChangeObserver = {
      periodChanged: vi.fn(async () => {}),
      periodAndFollowingChanged: vi.fn(async () => {}),
      currentPeriodChanged: vi.fn(async () => {}),
      allPeriodsChanged: vi.fn(async () => {}),
    };
    const adapter = new CoreAdapter(observer);

    await adapter.schedulingProcessDueMovements();

    expect(observer.currentPeriodChanged).toHaveBeenCalledOnce();
  });
});
