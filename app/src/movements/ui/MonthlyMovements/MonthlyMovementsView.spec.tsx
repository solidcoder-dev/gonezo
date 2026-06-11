import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TransactionHistoryItemView } from '../../../transactions/application/transactionView.types';
import { MonthlyMovementsView } from './MonthlyMovementsView';
import type { MonthlyMovementsViewProps } from './MonthlyMovementsView.contract';

function postedMovement(input: Partial<TransactionHistoryItemView> = {}): TransactionHistoryItemView {
  return {
    id: 'tx-1',
    accountId: 'acc-1',
    occurredAt: '2026-06-10T10:00:00.000Z',
    description: 'Groceries',
    merchant: 'Groceries',
    amount: '12.50',
    currency: 'USD',
    type: 'expense',
    status: 'posted',
    items: [],
    ...input,
  };
}

function makeProps(overrides: Partial<MonthlyMovementsViewProps> = {}): MonthlyMovementsViewProps {
  const required: MonthlyMovementsViewProps['required'] = {
    state: {
      accountId: 'acc-1',
      monthLabel: 'June 2026',
      isCurrentMonth: true,
      monthMenuOpen: false,
      monthPickerOpen: false,
      monthPickerYear: 2026,
      viewedMonthIndex: 5,
      viewedYear: 2026,
      currentMonthIndex: 5,
      currentYear: 2026,
      items: [postedMovement()],
      scheduledItems: [],
      scheduledTotal: 0,
      scheduledHasMore: false,
      expectedItems: [],
      expectedTotal: 0,
      expectedHasMore: false,
      filterOptions: { categories: [], tags: [] },
      pagination: {
        page: 0,
        size: 100,
        totalElements: 12,
        totalPages: 2,
        hasNext: true,
        hasPrevious: false,
      },
    },
    status: { loading: false, disabled: false },
  };
  const provided: MonthlyMovementsViewProps['provided'] = {
    commands: {
      goToPreviousMonth: vi.fn(),
      goToCurrentMonth: vi.fn(),
      goToNextMonth: vi.fn(),
      toggleMonthMenu: vi.fn(),
      closeMonthMenu: vi.fn(),
      openMonthPicker: vi.fn(),
      closeMonthPicker: vi.fn(),
      goToPreviousPickerYear: vi.fn(),
      goToNextPickerYear: vi.fn(),
      selectPickerMonth: vi.fn(),
      goToPreviousPage: vi.fn(),
      goToNextPage: vi.fn(),
      requestVoid: vi.fn(),
      deactivateScheduledMovement: vi.fn(),
      editScheduledMovement: vi.fn(),
      postExpectedMovement: vi.fn(),
      dismissExpectedMovement: vi.fn(),
      editExpectedMovement: vi.fn(),
    },
  };
  return {
    required: overrides.required ?? required,
    provided: overrides.provided ?? provided,
  };
}

describe('MonthlyMovementsView', () => {
  it('renders a posted movement load more control', () => {
    const props = makeProps();

    render(<MonthlyMovementsView {...props} />);

    expect(screen.queryByText('Page 1 of 2')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(props.provided.commands.goToNextPage).toHaveBeenCalledTimes(1);
  });
});
