import { describe, expect, it, vi } from 'vitest';
import { runTransactionSubmissionPlan } from './transactionSubmissionPlan';

function baseInput() {
  return {
    ports: {
      scheduling: {
        schedulingCreateMovement: vi.fn(),
        schedulingUpdateMovement: vi.fn(),
        schedulingDeactivateMovement: vi.fn(),
        schedulingListMovements: vi.fn(),
        schedulingGetMovement: vi.fn(),
        movementsGetOverview: vi.fn(),
        movementsListScheduled: vi.fn(),
      },
      expected: {
        expectedCreateMovement: vi.fn(),
        expectedUpdateMovement: vi.fn(),
        expectedListMovements: vi.fn(),
      expectedResolveMovement: vi.fn().mockResolvedValue(undefined),
      expectedDismissMovement: vi.fn(),
      },
      sharing: {
        sharingListPeople: vi.fn(),
        sharingApplyShareToPostedTransaction: vi.fn(),
        sharingGetMovementDetails: vi.fn(),
        sharingListMovementDetails: vi.fn(),
      },
      analytics: {
        analyticsSetMovementIgnored: vi.fn(),
      },
    },
    ledgerTransactionCommands: {
      recordExpense: vi.fn().mockResolvedValue({ id: 'tx-1' }),
      recordIncome: vi.fn(),
      recordTransfer: vi.fn(),
      recordTransferFx: vi.fn(),
      createExpenseDraft: vi.fn(),
      addTransactionItem: vi.fn(),
      postDraftTransaction: vi.fn(),
    },
    clock: {
      now: () => new Date('2026-05-18T10:20:30.000Z'),
      resolveOccurredAt: (dateInput: string) => `${dateInput}T10:20:30.000Z`,
      resolveTimeZoneId: () => 'UTC',
    },
    accountId: 'account-1',
    accounts: [
      { id: 'account-1', name: 'Checking', type: 'cash', currency: 'USD', status: 'active' },
      { id: 'account-2', name: 'Savings', type: 'cash', currency: 'EUR', status: 'active' },
    ],
    accountCurrency: 'USD',
    composerMode: 'expense' as const,
    amount: '12',
    resolvedTransactionDate: '2026-05-14',
    transactionNote: 'Lunch',
    transferToAccountId: '',
    transferAmountIn: '',
    transferFxRate: '1',
    transferFxMode: 'auto_destination' as const,
    schedulingMode: 'now' as const,
    schedulingKind: 'one_shot' as const,
    recurrenceEnabled: false,
    recurrenceFrequency: 'monthly' as const,
    recurrenceInterval: '1',
    recurrenceWeeklyDay: '1',
    recurrenceMonthlyPattern: 'day_of_month' as const,
    recurrenceDayOfMonth: '14',
    recurrenceMonthlyOrdinal: '1',
    recurrenceMonthlyWeekday: '1',
    recurrenceEndKind: 'never' as const,
    recurrenceEndDate: '',
    recurrenceEndCount: '12',
    movementExpected: false,
    movementIgnored: false,
    movementScheduled: false,
    expenseDetailed: false,
    expenseItems: [],
    editedScheduledMovementId: '',
    editedExpectedMovementId: '',
    postExpectedMovementId: '',
    resolveCategorySelection: vi.fn().mockResolvedValue('cat-1'),
    parseTransactionTags: vi.fn().mockReturnValue(['tag']),
    resolveTagSelectionIds: vi.fn().mockReturnValue(['tag-1']),
    categorizeTransaction: vi.fn().mockResolvedValue(undefined),
    applyTransactionTags: vi.fn().mockResolvedValue(undefined),
  };
}

describe('transaction submission plan', () => {
  it('runs the posted expense handler and taxonomy assignments', async () => {
    const input = baseInput();

    await expect(runTransactionSubmissionPlan(input)).resolves.toEqual({
      recorded: true,
      postedTransactionId: 'tx-1',
    });

    expect(input.ledgerTransactionCommands.recordExpense).toHaveBeenCalledWith({
      accountId: 'account-1',
      occurredAt: '2026-05-14T10:20:30.000Z',
      amount: '12',
      currency: 'USD',
      description: 'Lunch',
      merchant: 'Lunch',
      categoryId: 'cat-1',
    });
    expect(input.categorizeTransaction).toHaveBeenCalledWith('tx-1', 'expense', 'cat-1');
    expect(input.applyTransactionTags).toHaveBeenCalledWith('tx-1', ['tag']);
  });

  it('marks a posted expense as ignored when requested', async () => {
    const input = {
      ...baseInput(),
      movementIgnored: true,
    };

    await runTransactionSubmissionPlan(input);

    expect(input.ports.analytics.analyticsSetMovementIgnored).toHaveBeenCalledWith({
      movementId: 'tx-1',
      ignored: true,
      changedAt: '2026-05-18T10:20:30.000Z',
    });
  });

  it('carries ignored state into expected expenses', async () => {
    const input = {
      ...baseInput(),
      movementExpected: true,
      movementIgnored: true,
    };

    await runTransactionSubmissionPlan(input);

    expect(input.ports.expected.expectedCreateMovement).toHaveBeenCalledWith(expect.objectContaining({
      type: 'expense',
      ignored: true,
    }));
    expect(input.ports.analytics.analyticsSetMovementIgnored).not.toHaveBeenCalled();
  });

  it('runs the posted FX transfer handler', async () => {
    const input = {
      ...baseInput(),
      composerMode: 'transfer' as const,
      amount: '100',
      transferToAccountId: 'account-2',
      transferAmountIn: '85',
      transferFxMode: 'auto_rate' as const,
    };
    input.ledgerTransactionCommands.recordTransferFx.mockResolvedValue({
      transferOutId: 'out-1',
      transferInId: 'in-1',
    });

    await expect(runTransactionSubmissionPlan(input)).resolves.toEqual({
      recorded: true,
      postedTransactionId: '',
    });

    expect(input.ledgerTransactionCommands.recordTransferFx).toHaveBeenCalledWith({
      fromAccountId: 'account-1',
      toAccountId: 'account-2',
      occurredAt: '2026-05-14T10:20:30.000Z',
      sourceAmount: '100.00',
      sourceCurrency: 'USD',
      destinationAmount: '85.00',
      destinationCurrency: 'EUR',
      exchangeRate: '0.85',
      description: 'Lunch',
    });
    expect(input.applyTransactionTags).toHaveBeenCalledWith('out-1', ['tag']);
    expect(input.applyTransactionTags).toHaveBeenCalledWith('in-1', ['tag']);
  });

  it('creates one-shot scheduled expenses instead of posting them', async () => {
    const input = {
      ...baseInput(),
      schedulingMode: 'scheduled' as const,
      movementScheduled: true,
    };

    await expect(runTransactionSubmissionPlan(input)).resolves.toEqual({
      recorded: true,
      postedTransactionId: '',
    });

    expect(input.ports.scheduling.schedulingCreateMovement).toHaveBeenCalledWith(expect.objectContaining({
      type: 'expense',
      sourceAccountId: 'account-1',
      amount: '12.00',
      currency: 'USD',
      categoryId: 'cat-1',
      scheduleKind: 'one_shot',
      startAt: '2026-05-14T10:20:30.000Z',
    }));
    expect(input.ledgerTransactionCommands.recordExpense).not.toHaveBeenCalled();
  });

  it('creates expected recurring expenses through a confirmation-required schedule', async () => {
    const input = {
      ...baseInput(),
      recurrenceEnabled: true,
      movementExpected: true,
    };

    await expect(runTransactionSubmissionPlan(input)).resolves.toEqual({
      recorded: true,
      postedTransactionId: '',
    });

    expect(input.ports.expected.expectedCreateMovement).not.toHaveBeenCalled();
    expect(input.ports.scheduling.schedulingCreateMovement).toHaveBeenCalledWith(expect.objectContaining({
      type: 'expense',
      reviewPolicy: 'require_user_confirmation',
      scheduleKind: 'recurring',
    }));
    expect(input.ledgerTransactionCommands.recordExpense).not.toHaveBeenCalled();
  });

  it('resolves a posted expected movement only after the posted transaction succeeds', async () => {
    const input = {
      ...baseInput(),
      postExpectedMovementId: 'expected-1',
      accountId: 'account-2',
      accountCurrency: 'EUR',
      amount: '50',
      transactionNote: 'Tricount changed',
      expenseItems: [
        { id: 'item-final-1', name: 'Alice', amount: '30' },
        { id: 'item-final-2', name: 'Bob', amount: '20' },
      ],
      resolvedTransactionDate: '2026-05-15',
      ports: {
        ...baseInput().ports,
        expected: {
          ...baseInput().ports.expected,
          expectedPostMovement: vi.fn().mockResolvedValue({ transactionId: 'tx-expected' }),
        },
      },
    };

    await runTransactionSubmissionPlan(input);

    expect(input.ports.expected.expectedPostMovement).toHaveBeenCalledWith({
      expectedMovementId: 'expected-1',
      movement: {
        accountId: 'account-2',
        type: 'expense',
        amount: '50.00',
        currency: 'EUR',
        description: 'Tricount changed',
        merchant: 'Tricount changed',
        splitItems: [
          { id: 'item-final-1', name: 'Alice', amount: '30.00' },
          { id: 'item-final-2', name: 'Bob', amount: '20.00' },
        ],
      },
      occurredAt: '2026-05-15T10:20:30.000Z',
      categoryId: 'cat-1',
      tagNames: ['tag'],
      ignored: false,
      idempotencyKey: 'expected-1',
    });
    expect(input.ports.expected.expectedPostMovement).toHaveBeenCalledTimes(1);
    expect(input.ledgerTransactionCommands.recordExpense).not.toHaveBeenCalled();
    expect(input.ports.expected.expectedResolveMovement).not.toHaveBeenCalled();
  });

  it('rejects expected posting before side effects when the capability is absent', async () => {
    const input = { ...baseInput(), postExpectedMovementId: 'expected-1' };

    await expect(runTransactionSubmissionPlan(input)).rejects.toThrow(
      'Expected movement posting is not supported by this runtime',
    );
    expect(input.ledgerTransactionCommands.recordExpense).not.toHaveBeenCalled();
    expect(input.ledgerTransactionCommands.recordIncome).not.toHaveBeenCalled();
    expect(input.ports.expected.expectedResolveMovement).not.toHaveBeenCalled();
    expect(input.categorizeTransaction).not.toHaveBeenCalled();
    expect(input.applyTransactionTags).not.toHaveBeenCalled();
    expect(input.ports.sharing.sharingApplyShareToPostedTransaction).not.toHaveBeenCalled();
    expect(input.ports.analytics.analyticsSetMovementIgnored).not.toHaveBeenCalled();
  });

  it('uses income category selection when posting an expected income', async () => {
    const input = {
      ...baseInput(),
      composerMode: 'income' as const,
      postExpectedMovementId: 'expected-income',
      ports: {
        ...baseInput().ports,
        expected: {
          ...baseInput().ports.expected,
          expectedPostMovement: vi.fn().mockResolvedValue({ transactionId: 'tx-income' }),
        },
      },
    };

    await runTransactionSubmissionPlan(input);

    expect(input.resolveCategorySelection).toHaveBeenCalledWith('income');
    expect(input.resolveCategorySelection).not.toHaveBeenCalledWith('expense');
    expect(input.ports.expected.expectedPostMovement).toHaveBeenCalledWith(expect.objectContaining({
      movement: expect.objectContaining({
        accountId: 'account-1',
        type: 'income',
        amount: '12.00',
        currency: 'USD',
        description: 'Lunch',
        merchant: 'Lunch',
      }),
      sharingOverride: undefined,
    }));
  });
});
