import { describe, expect, it } from 'vitest';
import { presentOverviewSnapshot, presentOverviewStarters } from './OverviewTabPresentation';

const snapshot = {
  currentWindow: { label: 'Jul 2026', startDate: '2026-07-01', endDate: '2026-07-31' },
  previousWindow: { label: 'Jun 2026', startDate: '2026-06-01', endDate: '2026-06-30' },
  currentTotals: { incomeAmount: '139.48', expenseAmount: '611.59', netFlowAmount: '-472.11' },
  netFlowChangePercent: '-12.5',
  biggestExpense: { movementId: 'expense-1', title: 'Rent', amount: '611.59', occurredAt: '2026-07-01' },
  biggestIncome: { movementId: 'income-1', title: 'Car loan', amount: '139.48', occurredAt: '2026-07-07' },
};

describe('OverviewTabPresentation', () => {
  it('maps the snapshot with numeric tones, signs and a common safe scale', () => {
    const view = presentOverviewSnapshot(snapshot, 'EUR');
    expect(view.netFlowTone).toBe('expense');
    expect(view.comparisonTone).toBe('expense');
    expect(view.comparisonDirection).toBe('down');
    expect(view.netFlowAmount).toContain('-');
    expect(view.incomeShare).toBeCloseTo(22.81, 1);
    expect(view.expenseShare).toBe(100);
  });

  it('keeps the required preview order and recurring data available to See all', () => {
    const view = presentOverviewStarters(snapshot, {
      items: [
        { key: 'mostSharedWith', title: 'Most shared with', subtitle: 'Ana', amount: '30.00' },
        { key: 'recurringImpact', title: 'Recurring impact', subtitle: '1 recurring', amount: '145.90' },
        { key: 'transfers', title: 'Transfers', subtitle: '4 transfers', amount: '220.00' },
        { key: 'topTags', title: 'Top tags', subtitle: 'Travel', amount: '80.00' },
        { key: 'sharedExpenses', title: 'Shared expenses', subtitle: '2 shared', amount: '40.00' },
      ],
    }, 'EUR');
    expect(view.map((item) => item.key)).toEqual([
      'biggestExpense', 'biggestIncome', 'topTags', 'sharedExpenses', 'transfers', 'mostSharedWith', 'recurringImpact',
    ]);
    expect(view[0].tone).toBe('expense');
    expect(view[1].tone).toBe('income');
    expect(view[0].amount).toContain('-');
    expect(view[1].amount).toContain('+');
  });

  it('handles zero totals without a false bar or positive zero sign', () => {
    const view = presentOverviewSnapshot({ currentWindow: { label: 'All time', startDate: '', endDate: '' }, currentTotals: { incomeAmount: '0.00', expenseAmount: '0.00', netFlowAmount: '0.00' }, netFlowChangePercent: '0' }, 'EUR');
    expect(view.incomeShare).toBe(0);
    expect(view.expenseShare).toBe(0);
    expect(view.netFlowAmount.startsWith('+')).toBe(false);
    expect(view.comparisonDirection).toBe('flat');
  });
});
