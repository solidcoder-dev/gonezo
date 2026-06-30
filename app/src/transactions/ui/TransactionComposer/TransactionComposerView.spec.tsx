import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TransactionComposerView, type TransactionComposerViewProvided, type TransactionComposerViewRequired } from './TransactionComposerView';

function makeRequired(overrides: Partial<TransactionComposerViewRequired> = {}): TransactionComposerViewRequired {
  return {
    open: true,
    mode: 'expense',
    disabled: false,
    amount: '20.00',
    date: '2026-06-30',
    note: '',
    categoryId: '',
    categoryOptions: [],
    tagInput: '',
    selectedTagOptions: [],
    tagSuggestions: [],
    advancedOpen: false,
    transferTargetAccountId: '',
    sourceAccountId: 'account-1',
    sourceAccountOptions: [{ id: 'account-1', name: 'Checking', currency: 'EUR', type: 'bank' }],
    transferTargetOptions: [],
    transferAmountIn: '',
    transferFxRate: '1',
    transferFxMode: 'auto_destination',
    transferCrossCurrency: false,
    expenseDetailed: false,
    splitEditorOpen: false,
    splitApplied: false,
    splitDraftMode: 'items',
    expenseItems: [],
    expenseItemOptions: [],
    expenseItemName: '',
    expenseItemAmount: '',
    editingExpenseItemId: '',
    expenseSplitTotal: '0.00',
    expenseSplitRemaining: '20.00',
    schedulingMode: 'now',
    schedulingKind: 'one_shot',
    recurrenceFrequency: 'monthly',
    recurrenceInterval: '1',
    recurrenceWeeklyDay: '1',
    recurrenceMonthlyPattern: 'day_of_month',
    recurrenceDayOfMonth: '30',
    recurrenceMonthlyOrdinal: '1',
    recurrenceMonthlyWeekday: '1',
    recurrenceEndKind: 'never',
    recurrenceEndDate: '',
    recurrenceEndCount: '',
    scheduleEditorOpen: false,
    expected: false,
    shareEditorOpen: false,
    shareApplied: false,
    movementIgnored: false,
    currencyCode: 'EUR',
    ...overrides,
  };
}

function makeProvided(overrides: Partial<TransactionComposerViewProvided> = {}): TransactionComposerViewProvided {
  return {
    onOpen: vi.fn(),
    onClose: vi.fn(),
    onSelectMode: vi.fn(),
    onSelectSourceAccount: vi.fn(),
    onToggleAdvanced: vi.fn(),
    onSetAmount: vi.fn(),
    onSetDate: vi.fn(),
    onSetNote: vi.fn(),
    onSetCategoryId: vi.fn(),
    onSetTagInput: vi.fn(),
    onSelectTag: vi.fn(),
    onCreateTag: vi.fn(),
    onRemoveTag: vi.fn(),
    onRemoveLastTag: vi.fn(),
    onSetTransferTarget: vi.fn(),
    onSetTransferAmountIn: vi.fn(),
    onSetTransferFxRate: vi.fn(),
    onSetTransferFxMode: vi.fn(),
    onToggleExpenseDetailed: vi.fn(),
    onOpenSplitEditor: vi.fn(),
    onCloseSplitEditor: vi.fn(),
    onApplySplit: vi.fn(),
    onRemoveSplit: vi.fn(),
    onSetExpenseItemName: vi.fn(),
    onSetExpenseItemAmount: vi.fn(),
    onStartExpenseItem: vi.fn(),
    onCancelExpenseItem: vi.fn(),
    onAddExpenseItem: vi.fn(),
    onEditExpenseItem: vi.fn(),
    onRemoveExpenseItem: vi.fn(),
    onSplitByParts: vi.fn(),
    onSplitByWeightedParts: vi.fn(),
    onSelectSplitMode: vi.fn(),
    onSetSchedulingMode: vi.fn(),
    onSetSchedulingKind: vi.fn(),
    onOpenRecurringScheduleEditor: vi.fn(),
    onApplyRecurringSchedule: vi.fn(),
    onCloseRecurringScheduleEditor: vi.fn(),
    onRemoveRecurringSchedule: vi.fn(),
    onSetRecurrenceFrequency: vi.fn(),
    onSetRecurrenceInterval: vi.fn(),
    onSetRecurrenceWeeklyDay: vi.fn(),
    onSetRecurrenceMonthlyPattern: vi.fn(),
    onSetRecurrenceDayOfMonth: vi.fn(),
    onSetRecurrenceMonthlyOrdinal: vi.fn(),
    onSetRecurrenceMonthlyWeekday: vi.fn(),
    onSetRecurrenceEndKind: vi.fn(),
    onSetRecurrenceEndDate: vi.fn(),
    onSetRecurrenceEndCount: vi.fn(),
    onSetExpected: vi.fn(),
    onSetMovementIgnored: vi.fn(),
    onCloseShareEditor: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  };
}

describe('TransactionComposerView movement more control', () => {
  it('shows More for expense and updates Ignore movement from the sheet', () => {
    const onSetMovementIgnored = vi.fn();
    render(
      <TransactionComposerView
        required={makeRequired()}
        provided={makeProvided({ onSetMovementIgnored })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /More/i }));
    fireEvent.click(screen.getByRole('switch', { name: /Ignore movement/i }));

    expect(screen.getByRole('dialog', { name: 'More' })).toBeInTheDocument();
    expect(onSetMovementIgnored).toHaveBeenCalledWith(true);
  });

  it('does not show More for transfer', () => {
    render(
      <TransactionComposerView
        required={makeRequired({ mode: 'transfer' })}
        provided={makeProvided()}
      />,
    );

    expect(screen.queryByRole('button', { name: /More/i })).not.toBeInTheDocument();
  });
});
