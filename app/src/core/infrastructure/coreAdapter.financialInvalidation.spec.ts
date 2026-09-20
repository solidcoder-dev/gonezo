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
      currentPeriodChanged: vi.fn(async () => {}),
      allPeriodsChanged: vi.fn(async () => {}),
    };
    const adapter = new CoreAdapter(observer);
    const input = { accountId: 'account', occurredAt: '2025-04-03T11:00:00Z', amount: '20', currency: 'GBP' };

    await expect(adapter.ledgerRecordExpense(input)).resolves.toEqual({ id: 'transaction' });

    expect(record).toHaveBeenCalledWith(input);
    expect(observer.periodChanged).toHaveBeenCalledWith(input.occurredAt);
  });

  it('does not enqueue rebuild work after the financial mutation fails', async () => {
    vi.spyOn(CoreAdapterWeb.prototype, 'ledgerRecordExpense').mockRejectedValue(new Error('mutation failed'));
    const observer: FinancialDataChangeObserver = {
      periodChanged: vi.fn(async () => {}),
      currentPeriodChanged: vi.fn(async () => {}),
      allPeriodsChanged: vi.fn(async () => {}),
    };
    const adapter = new CoreAdapter(observer);

    await expect(adapter.ledgerRecordExpense({ accountId: 'account', occurredAt: '2025-04-03T11:00:00Z', amount: '20', currency: 'GBP' }))
      .rejects.toThrow('mutation failed');

    expect(observer.periodChanged).not.toHaveBeenCalled();
  });

  it('keeps financial success when optional rebuild persistence fails', async () => {
    vi.spyOn(CoreAdapterWeb.prototype, 'ledgerRecordExpense').mockResolvedValue({ id: 'transaction' });
    const observer: FinancialDataChangeObserver = {
      periodChanged: vi.fn(async () => { throw new Error('storage unavailable'); }),
      currentPeriodChanged: vi.fn(async () => {}),
      allPeriodsChanged: vi.fn(async () => {}),
    };
    const adapter = new CoreAdapter(observer);

    await expect(adapter.ledgerRecordExpense({ accountId: 'account', occurredAt: '2025-04-03T11:00:00Z', amount: '20', currency: 'GBP' }))
      .resolves.toEqual({ id: 'transaction' });
  });
});
