import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
      pendingVoidTransactionId: undefined,
      pendingDeactivateScheduledId: undefined,
      pendingDismissExpectedId: undefined,
    },
    status: { loading: false, disabled: false },
    detail: {
      state: {
        open: false,
        activeSheet: null,
        overflowOpen: false,
        categoryQuery: '',
        tagsQuery: '',
      },
      data: {
        movement: null,
        categories: [],
        draftTags: [],
        suggestedTags: [],
      },
      status: {
        savingCategory: false,
        savingTags: false,
        tagsDirty: false,
        togglingIgnored: false,
        deactivating: false,
        pendingVoid: false,
      },
    },
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
      openPostedMovementDetail: vi.fn(),
      openScheduledMovementDetail: vi.fn(),
      openExpectedMovementDetail: vi.fn(),
    },
    detail: {
      commands: {
        closeDetail: vi.fn(),
        dismissSheet: vi.fn(),
        toggleOverflow: vi.fn(),
        openCategorySheet: vi.fn(),
        openTagsSheet: vi.fn(),
        openSharingSheet: vi.fn(),
        openItemsSheet: vi.fn(),
        openMoreDetailsSheet: vi.fn(),
        setCategoryQuery: vi.fn(),
        setTagsQuery: vi.fn(),
        saveCategory: vi.fn(),
        toggleDraftTag: vi.fn(),
        saveTags: vi.fn(),
        setIgnored: vi.fn(),
        runOverflowAction: vi.fn(),
        deactivateScheduledMovement: vi.fn(),
        postExpectedMovement: vi.fn(),
      },
    },
  };
  return {
    required: overrides.required ?? required,
    provided: overrides.provided ?? provided,
  };
}

describe('MonthlyMovementsView', () => {
  it('does not render the page title or search action inline', () => {
    const props = makeProps();

    render(
      <MemoryRouter>
        <MonthlyMovementsView {...props} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('heading', { name: 'Movements' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Search movements' })).not.toBeInTheDocument();
  });

  it('renders a posted movement load more control', () => {
    const props = makeProps();

    render(
      <MemoryRouter>
        <MonthlyMovementsView {...props} />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Page 1 of 2')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(props.provided.commands.goToNextPage).toHaveBeenCalledTimes(1);
  });
});
