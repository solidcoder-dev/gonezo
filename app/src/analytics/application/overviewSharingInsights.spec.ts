import { describe, expect, it } from 'vitest';
import { buildOverviewSharingInsights } from './overviewSharingInsights';

describe('overviewSharingInsights', () => {
  it('aggregates shared movement facts using personal amounts by default', () => {
    const result = buildOverviewSharingInsights([
      {
        shareId: 'share-1',
        transactionId: 'tx-1',
        participants: [
          {
            participantId: 'p-1',
            personId: 'person-1',
            displayName: 'Ana',
            amount: '80.00',
            reimbursable: true,
            repaymentStatus: 'pending',
          },
          {
            participantId: 'p-2',
            personId: 'person-2',
            displayName: 'Luis',
            amount: '40.00',
            reimbursable: true,
            repaymentStatus: 'paid',
          },
        ],
        analytics: {
          personalExpenseAmount: '60.00',
          excludedLentAmount: '120.00',
          excludedReimbursementIncomeAmount: '40.00',
        },
      },
      {
        shareId: 'share-2',
        transactionId: 'tx-2',
        participants: [
          {
            participantId: 'p-3',
            personId: 'person-1',
            displayName: 'Ana',
            amount: '70.00',
            reimbursable: true,
            repaymentStatus: 'pending',
          },
        ],
        analytics: {
          personalExpenseAmount: '30.00',
          excludedLentAmount: '70.00',
          excludedReimbursementIncomeAmount: '0.00',
        },
      },
    ]);

    expect(result).toEqual([
      {
        key: 'sharedExpenses',
        title: 'Shared expenses',
        subtitle: '2 shared',
        amount: '90.00',
      },
      {
        key: 'mostSharedWith',
        title: 'Most shared with',
        subtitle: 'Ana',
        amount: '150.00',
      },
    ]);
  });

  it('omits sharing insights when there are no shared movements', () => {
    expect(buildOverviewSharingInsights([])).toEqual([]);
  });

  it('counts shared movements without requiring reimbursable participants and supports full amounts', () => {
    expect(buildOverviewSharingInsights([{
      shareId: 'share-1',
      transactionId: 'tx-1',
      participants: [{ participantId: 'p-1', personId: 'person-1', displayName: 'Ana', amount: '40.00', reimbursable: false, repaymentStatus: 'not_applicable' }],
      analytics: { personalExpenseAmount: '60.00', excludedLentAmount: '40.00', excludedReimbursementIncomeAmount: '0.00' },
    }], 'full')).toEqual([
      { key: 'sharedExpenses', title: 'Shared expenses', subtitle: '1 shared', amount: '100.00' },
    ]);
  });
});
