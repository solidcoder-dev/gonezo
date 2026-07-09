import { describe, expect, it } from 'vitest';
import { buildOverviewSharingInsights } from './overviewSharingInsights';

describe('overviewSharingInsights', () => {
  it('aggregates reimbursable sharing facts into the two overview cards', () => {
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
        amount: '190.00',
      },
      {
        key: 'mostSharedWith',
        title: 'Most shared with',
        subtitle: 'Ana',
        amount: '150.00',
      },
    ]);
  });

  it('returns a stable zero state when there are no sharing details', () => {
    expect(buildOverviewSharingInsights([])).toEqual([
      {
        key: 'sharedExpenses',
        title: 'Shared expenses',
        subtitle: '0 shared',
        amount: '0.00',
      },
      {
        key: 'mostSharedWith',
        title: 'Most shared with',
        subtitle: 'No data',
        amount: '0.00',
      },
    ]);
  });
});
