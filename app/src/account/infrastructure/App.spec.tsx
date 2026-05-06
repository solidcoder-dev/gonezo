import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { resolveSchedulingKind } from '../../shared/domain/schedulingKind';
import type { AccountsCorePort } from '../application/accountsCore.port';
import type {
  LedgerListTransactionsInput,
  LedgerListTransactionsResult,
  LedgerTransactionListItem,
  MovementsMonthOverviewInput,
  MovementsSearchFiltersInput,
  MovementsSearchInput,
  MovementsSearchResult,
  MovementsListScheduledInput,
  ExpectedMovementItem,
  SchedulingMovementItem,
} from '../../shared/domain/corePort';

function toPagedResult(
  source: LedgerTransactionListItem[],
  input: LedgerListTransactionsInput,
): LedgerListTransactionsResult {
  const filters = input.filters ?? {};
  const categoryIds = filters.categoryIds && filters.categoryIds.length > 0
    ? filters.categoryIds
    : filters.categoryId
      ? [filters.categoryId]
      : [];
  const tagIds = filters.tagIds ?? [];
  const parsedMinAmount = filters.amountMin == null ? undefined : Number(filters.amountMin);
  const parsedMaxAmount = filters.amountMax == null ? undefined : Number(filters.amountMax);
  const hasMinAmount = typeof parsedMinAmount === 'number' && Number.isFinite(parsedMinAmount);
  const hasMaxAmount = typeof parsedMaxAmount === 'number' && Number.isFinite(parsedMaxAmount);
  const size = input.pagination?.size ?? 20;
  const requestedPage = input.pagination?.page ?? 0;
  const sort = input.sort && input.sort.length > 0 ? input.sort : [{ field: 'occurredAt', direction: 'desc' as const }];

  const filtered = source
    .filter((item) => item.accountId === input.accountId)
    .filter((item) => !filters.statuses || filters.statuses.length === 0 || filters.statuses.includes(item.status))
    .filter((item) => !filters.types || filters.types.length === 0 || filters.types.includes(item.type))
    .filter((item) => categoryIds.length === 0 || (item.categoryId != null && categoryIds.includes(item.categoryId)))
    .filter((item) => tagIds.length === 0 || (item.tags ?? []).some((tag) => tagIds.includes(tag.id)))
    .filter((item) => {
      if (!hasMinAmount && !hasMaxAmount) {
        return true;
      }
      const amount = Number(item.amount);
      if (!Number.isFinite(amount)) {
        return false;
      }
      if (hasMinAmount && amount < parsedMinAmount!) {
        return false;
      }
      if (hasMaxAmount && amount > parsedMaxAmount!) {
        return false;
      }
      return true;
    })
    .filter((item) => !filters.fromDate || item.occurredAt >= filters.fromDate)
    .filter((item) => !filters.toDate || item.occurredAt <= filters.toDate)
    .filter((item) => !filters.merchant || (item.merchant ?? '').toLowerCase().includes(filters.merchant.toLowerCase()))
    .filter((item) => {
      if (!filters.text) {
        return true;
      }
      const normalizedText = filters.text.toLowerCase();
      return (item.merchant ?? '').toLowerCase().includes(normalizedText)
        || (item.description ?? '').toLowerCase().includes(normalizedText);
    });

  const sorted = [...filtered].sort((left, right) => {
    for (const criterion of sort) {
      let comparison = 0;
      if (criterion.field === 'amount') {
        comparison = Number(left.amount) - Number(right.amount);
      } else {
        comparison = left.occurredAt.localeCompare(right.occurredAt);
      }
      if (comparison !== 0) {
        return criterion.direction === 'asc' ? comparison : -comparison;
      }
    }
    return right.id.localeCompare(left.id);
  });

  const totalElements = sorted.length;
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);
  const page = totalPages === 0 ? 0 : Math.min(Math.max(requestedPage, 0), totalPages - 1);
  const start = page * size;
  const content = sorted.slice(start, start + size);

  return {
    content,
    page,
    size,
    totalElements,
    totalPages,
    hasNext: totalPages > 0 && page + 1 < totalPages,
    hasPrevious: page > 0,
  };
}

function isoInCurrentMonth(day: number, hour = 12, minute = 0): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), day, hour, minute, 0, 0).toISOString();
}

function scheduledDateEpoch(item: SchedulingMovementItem): number | undefined {
  const candidate = item.nextDueAt ?? item.startAt;
  const parsed = candidate ? Date.parse(candidate) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isScheduledVisibleForAccount(item: SchedulingMovementItem, accountId: string): boolean {
  if (item.sourceAccountId === accountId) {
    return true;
  }
  return item.type === 'transfer' && item.targetAccountId === accountId;
}

function filterScheduledForOverview(
  items: SchedulingMovementItem[],
  input: { accountId: string; filters?: MovementsSearchFiltersInput } | MovementsListScheduledInput,
): SchedulingMovementItem[] {
  const filters = input.filters ?? {};
  const fromDateEpoch = filters.fromDate ? Date.parse(filters.fromDate) : undefined;
  const toDateEpoch = filters.toDate ? Date.parse(filters.toDate) : undefined;
  const hasFromDateEpoch = typeof fromDateEpoch === 'number' && Number.isFinite(fromDateEpoch);
  const hasToDateEpoch = typeof toDateEpoch === 'number' && Number.isFinite(toDateEpoch);

  return items
    .filter((item) => isScheduledVisibleForAccount(item, input.accountId))
    .filter((item) => {
      if (!hasFromDateEpoch && !hasToDateEpoch) {
        return true;
      }
      const dueEpoch = scheduledDateEpoch(item);
      if (dueEpoch == null) {
        return false;
      }
      if (hasFromDateEpoch && dueEpoch < fromDateEpoch!) {
        return false;
      }
      if (hasToDateEpoch && dueEpoch > toDateEpoch!) {
        return false;
      }
      return true;
    });
}

function filterExpectedForOverview(
  items: ExpectedMovementItem[],
  input: { accountId: string; filters?: MovementsSearchFiltersInput },
): ExpectedMovementItem[] {
  const filters = input.filters ?? {};
  const fromDateEpoch = filters.fromDate ? Date.parse(filters.fromDate) : undefined;
  const toDateEpoch = filters.toDate ? Date.parse(filters.toDate) : undefined;
  const hasFromDateEpoch = typeof fromDateEpoch === 'number' && Number.isFinite(fromDateEpoch);
  const hasToDateEpoch = typeof toDateEpoch === 'number' && Number.isFinite(toDateEpoch);

  return items
    .filter((movement) => movement.accountId === input.accountId)
    .filter((movement) => movement.status === 'pending')
    .filter((movement) => {
      if (!hasFromDateEpoch && !hasToDateEpoch) {
        return true;
      }
      const expectedEpoch = Date.parse(movement.expectedAt);
      if (!Number.isFinite(expectedEpoch)) {
        return false;
      }
      if (hasFromDateEpoch && expectedEpoch < fromDateEpoch!) {
        return false;
      }
      if (hasToDateEpoch && expectedEpoch > toDateEpoch!) {
        return false;
      }
      return true;
    })
    .sort((left, right) => {
      const dateComparison = left.expectedAt.localeCompare(right.expectedAt);
      return dateComparison !== 0 ? dateComparison : left.id.localeCompare(right.id);
    });
}

function emptyExpectedPreview() {
  return {
    items: [] as ExpectedMovementItem[],
    total: 0,
    hasMore: false,
  };
}

function makeCore(transactionCount = 0): AccountsCorePort {
  const transactions: LedgerTransactionListItem[] = Array.from({ length: transactionCount }).map((_, index) => ({
    id: `tx-${index + 1}`,
    accountId: 'acc-1',
    occurredAt: isoInCurrentMonth((index % 20) + 1, 9, index % 60),
    description: `Description ${index + 1}`,
    merchant: `Merchant ${index + 1}`,
    amount: `${index + 1}.00`,
    currency: 'USD',
    type: index % 2 === 0 ? 'expense' : 'income',
    status: 'posted',
    items: [],
  }));
  const scheduledMovements: SchedulingMovementItem[] = [];
  const expectedMovements: ExpectedMovementItem[] = [];

  const core: AccountsCorePort = {
    ledgerListSupportedCurrencies: vi.fn(async () => ({ items: ['EUR', 'USD'] })),
    ledgerListAccounts: vi.fn(async () => ({
      items: [
        {
          id: 'acc-1',
          name: 'Main',
          type: 'cash',
          currency: 'USD',
          status: 'active',
        },
        {
          id: 'acc-2',
          name: 'Savings',
          type: 'savings',
          currency: 'USD',
          status: 'active',
        },
      ],
    })),
    ledgerGetAccountSummary: vi.fn(async () => ({
      accountId: 'acc-1',
      name: 'Main',
      type: 'cash',
      currency: 'USD',
      balanceAmount: '100.00',
    })),
    ledgerListTransactions: vi.fn(async (input) => toPagedResult(transactions, input)),
    ledgerOpenAccount: vi.fn(async () => ({ id: 'acc-1' })),
    ledgerRenameAccount: vi.fn(async () => undefined),
    ledgerArchiveAccount: vi.fn(async () => undefined),
    ledgerDeleteAccount: vi.fn(async () => undefined),
    ledgerRecordExpense: vi.fn(async () => ({ id: 'tx-exp' })),
    ledgerRecordIncome: vi.fn(async () => ({ id: 'tx-inc' })),
    ledgerRecordTransfer: vi.fn(async () => ({ transferOutId: 'tx-tr-out', transferInId: 'tx-tr-in' })),
    ledgerRecordTransferFx: vi.fn(async () => ({ transferOutId: 'tx-tr-fx-out', transferInId: 'tx-tr-fx-in' })),
    ledgerCreateExpenseDraft: vi.fn(async () => ({ id: 'tx-draft' })),
    ledgerAddTransactionItem: vi.fn(async () => undefined),
    ledgerPostDraftTransaction: vi.fn(async () => undefined),
    ledgerVoidTransaction: vi.fn(async () => undefined),
    taxonomyListCategories: vi.fn(async () => ({
      items: [
        { id: 'cat-food', name: 'Food', appliesTo: 'expense' as const, status: 'active' as const },
        { id: 'cat-salary', name: 'Salary', appliesTo: 'income' as const, status: 'active' as const },
      ],
    })),
    taxonomyCreateCategory: vi.fn(async () => ({ id: 'cat-created' })),
    taxonomyListTags: vi.fn(async () => ({
      items: [
        { id: 'tag-home', name: 'home', status: 'active' as const },
        { id: 'tag-london', name: 'london', status: 'active' as const },
      ],
    })),
    mobillsImport: vi.fn(async () => ({
      totalRows: 0,
      importedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      rows: [],
    })),
    orchestrationCategorizeTransaction: vi.fn(async () => ({ status: 'assigned' as const })),
    orchestrationApplyTransactionTags: vi.fn(async () => ({ status: 'assigned' as const })),
    orchestrationListTransactionTaxonomy: vi.fn(async () => ({ items: [] })),
    recurrenceCreateRecurringMovement: vi.fn(async () => ({ id: 'rec-1' })),
    recurrenceDeactivateRecurringMovement: vi.fn(async () => undefined),
    recurrenceListRecurringMovements: vi.fn(async () => ({ items: [] })),
    schedulingCreateMovement: vi.fn(async (input) => core.recurrenceCreateRecurringMovement(input)),
    schedulingDeactivateMovement: vi.fn(async (input) => core.recurrenceDeactivateRecurringMovement(input)),
    schedulingListMovements: vi.fn(async (input) => {
      const sourceAccountId = input.sourceAccountId;
      return { items: scheduledMovements.filter((item) => isScheduledVisibleForAccount(item, sourceAccountId)) };
    }),
    expectedCreateMovement: vi.fn(async (input) => {
      const now = new Date().toISOString();
      const id = `exp-${expectedMovements.length + 1}`;
      expectedMovements.push({
        id,
        accountId: input.accountId,
        type: input.type,
        amount: input.amount,
        currency: input.currency,
        expectedAt: input.expectedAt,
        description: input.description,
        merchant: input.merchant,
        categoryId: input.categoryId,
        splitItems: (input.splitItems ?? []).map((item: { id: string; name: string; amount: string }) => ({ ...item })),
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    }),
    expectedUpdateMovement: vi.fn(async (input) => {
      const movement = expectedMovements.find((item) => item.id === input.expectedMovementId);
      if (!movement) {
        throw new Error(`Expected movement not found: ${input.expectedMovementId}`);
      }
      const updatedAt = new Date().toISOString();
      movement.accountId = input.accountId;
      movement.type = input.type;
      movement.amount = input.amount;
      movement.currency = input.currency;
      movement.expectedAt = input.expectedAt;
      movement.description = input.description;
      movement.merchant = input.merchant;
      movement.categoryId = input.categoryId;
      movement.splitItems = (input.splitItems ?? []).map((item: { id: string; name: string; amount: string }) => ({ ...item }));
      movement.updatedAt = updatedAt;
      return { id: movement.id };
    }),
    expectedListMovements: vi.fn(async (input) => ({
      items: expectedMovements
        .filter((movement) => movement.accountId === input.accountId)
        .filter((movement) => input.includeClosed === true || movement.status === 'pending'),
    })),
    expectedResolveMovement: vi.fn(async (input) => {
      const movement = expectedMovements.find((item) => item.id === input.expectedMovementId);
      if (!movement) return;
      const resolvedAt = input.resolvedAt ?? new Date().toISOString();
      movement.status = 'resolved';
      movement.resolvedTransactionId = input.transactionId;
      movement.resolvedAt = resolvedAt;
      movement.updatedAt = resolvedAt;
    }),
    expectedDismissMovement: vi.fn(async (input) => {
      const movement = expectedMovements.find((item) => item.id === input.expectedMovementId);
      if (!movement) return;
      const dismissedAt = input.dismissedAt ?? new Date().toISOString();
      movement.status = 'dismissed';
      movement.dismissedAt = dismissedAt;
      movement.updatedAt = dismissedAt;
    }),
    movementsGetMonthOverview: vi.fn(async (input: MovementsMonthOverviewInput) => {
      const fromDate = input.fromDate ?? input.filters?.fromDate;
      const toDate = input.toDate ?? input.filters?.toDate;
      const postedPage = await core.ledgerListTransactions({
        accountId: input.accountId,
        filters: {
          fromDate,
          toDate,
          statuses: ['posted' as const],
        },
        pagination: {
          page: 0,
          size: 100,
        },
        sort: [{ field: 'occurredAt', direction: 'desc' as const }],
      });

      const allPosted = postedPage.content;

      const previewSize = input.scheduledPreviewSize ?? 5;
      const expectedPreviewSize = input.expectedPreviewSize ?? previewSize;
      const filteredScheduled = filterScheduledForOverview(scheduledMovements, {
        accountId: input.accountId,
        filters: {
          fromDate,
          toDate,
        },
      });
      const filteredExpected = filterExpectedForOverview(expectedMovements, {
        accountId: input.accountId,
        filters: {
          fromDate,
          toDate,
        },
      });

      return {
        scheduledPreview: {
          items: filteredScheduled.slice(0, previewSize),
          total: filteredScheduled.length,
          hasMore: filteredScheduled.length > previewSize,
        },
        expectedPreview: {
          items: filteredExpected.slice(0, expectedPreviewSize),
          total: filteredExpected.length,
          hasMore: filteredExpected.length > expectedPreviewSize,
        },
        postedPage: {
          ...postedPage,
          content: allPosted,
          page: 0,
          size: allPosted.length,
          totalElements: allPosted.length,
          totalPages: allPosted.length === 0 ? 0 : 1,
          hasNext: false,
          hasPrevious: false,
        },
        executedPage: {
          ...postedPage,
          content: allPosted,
          page: 0,
          size: allPosted.length,
          totalElements: allPosted.length,
          totalPages: allPosted.length === 0 ? 0 : 1,
          hasNext: false,
          hasPrevious: false,
        },
      };
    }),
    movementsGetOverview: vi.fn(async (input: MovementsMonthOverviewInput) => core.movementsGetMonthOverview(input)),
    movementsSearch: vi.fn(async (input: MovementsSearchInput): Promise<MovementsSearchResult> => {
      if (input.source === 'posted') {
        const page = await core.ledgerListTransactions({
          accountId: input.accountId,
          filters: {
            text: input.filters?.text,
            merchant: input.filters?.merchant,
            categoryId: input.filters?.categoryId,
            categoryIds: input.filters?.categoryIds,
            tagIds: input.filters?.tagIds,
            amountMin: input.filters?.amountMin,
            amountMax: input.filters?.amountMax,
            fromDate: input.filters?.fromDate,
            toDate: input.filters?.toDate,
            statuses: ['posted' as const],
            types: input.filters?.types,
          },
          pagination: input.pagination,
          sort: [
            {
              field: input.sort?.[0]?.field === 'amount' ? 'amount' : 'occurredAt',
              direction: input.sort?.[0]?.direction ?? 'desc',
            },
          ],
        });

        return {
          content: page.content.map((transaction) => ({
            id: transaction.id,
            source: 'posted' as const,
            type: transaction.type,
            status: transaction.status === 'posted' ? 'posted' as const : 'voided' as const,
            amount: transaction.amount,
            currency: transaction.currency,
            occurredAt: transaction.occurredAt,
            title: transaction.merchant || transaction.description || 'Movement',
            description: transaction.description,
            merchant: transaction.merchant,
            category: transaction.category,
            tags: transaction.tags,
            items: transaction.items,
          })),
          page: page.page,
          size: page.size,
          totalElements: page.totalElements,
          totalPages: page.totalPages,
          hasNext: page.hasNext,
          hasPrevious: page.hasPrevious,
        };
      }

      if (input.source === 'expected') {
        const filters = input.filters ?? {};
        const filtered = expectedMovements
          .filter((movement) => movement.accountId === input.accountId)
          .filter((movement) => movement.status === 'pending')
          .filter((movement) => !filters.text || (movement.merchant ?? movement.description ?? '').toLowerCase().includes(filters.text.toLowerCase()))
          .filter((movement) => !filters.merchant || (movement.merchant ?? '').toLowerCase().includes(filters.merchant.toLowerCase()))
          .filter((movement) => !filters.categoryId || movement.categoryId === filters.categoryId)
          .filter((movement) => !filters.categoryIds || filters.categoryIds.length === 0 || (movement.categoryId != null && filters.categoryIds.includes(movement.categoryId)))
          .filter((movement) => !filters.types || filters.types.length === 0 || filters.types.includes(movement.type));
        const size = input.pagination?.size ?? 20;
        const requestedPage = input.pagination?.page ?? 0;
        const totalElements = filtered.length;
        const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);
        const page = totalPages === 0 ? 0 : Math.min(Math.max(requestedPage, 0), totalPages - 1);
        const start = page * size;
        const content = filtered.slice(start, start + size).map((movement) => ({
          id: movement.id,
          source: 'expected' as const,
          type: movement.type,
          status: 'expected' as const,
          amount: movement.amount,
          currency: movement.currency,
          occurredAt: movement.expectedAt,
          title: movement.merchant || movement.description || 'Expected movement',
          description: movement.description,
          merchant: movement.merchant,
          categoryId: movement.categoryId,
          category: movement.categoryId ? { id: movement.categoryId, name: movement.categoryId } : undefined,
          tags: [],
        }));
        return {
          content,
          page,
          size,
          totalElements,
          totalPages,
          hasNext: totalPages > 0 && page + 1 < totalPages,
          hasPrevious: page > 0,
        };
      }

      const scheduled = filterScheduledForOverview(scheduledMovements, {
        accountId: input.accountId,
        filters: input.filters,
      });
      const size = input.pagination?.size ?? 20;
      const requestedPage = input.pagination?.page ?? 0;
      const totalElements = scheduled.length;
      const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);
      const page = totalPages === 0 ? 0 : Math.min(Math.max(requestedPage, 0), totalPages - 1);
      const start = page * size;
      const content = scheduled.slice(start, start + size).map((movement) => ({
        id: movement.id,
        source: 'scheduled' as const,
        type: movement.type,
        status: movement.status === 'active' ? 'scheduled' as const : movement.status === 'deactivated' ? 'deactivated' as const : 'failed' as const,
        amount: movement.amount,
        currency: movement.currency,
        occurredAt: movement.nextDueAt ?? movement.startAt,
        title: movement.merchant || movement.description || 'Scheduled movement',
        description: movement.description,
        merchant: movement.merchant,
        category: movement.categoryId ? { id: movement.categoryId, name: movement.categoryId } : undefined,
        tags: (movement.tagNames ?? movement.tagIds ?? []).map((tag) => ({ id: tag, name: tag })),
      }));

      return {
        content,
        page,
        size,
        totalElements,
        totalPages,
        hasNext: totalPages > 0 && page + 1 < totalPages,
        hasPrevious: page > 0,
      };
    }),
    movementsListScheduled: vi.fn(async (input: MovementsListScheduledInput) => {
      const source = filterScheduledForOverview(scheduledMovements, input);
      const size = input.pagination?.size ?? 20;
      const requestedPage = input.pagination?.page ?? 0;
      const page = Math.max(0, requestedPage);
      const totalElements = source.length;
      const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);
      const resolvedPage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);
      const start = resolvedPage * size;
      return {
        content: source.slice(start, start + size),
        page: resolvedPage,
        size,
        totalElements,
        totalPages,
        hasNext: totalPages > 0 && resolvedPage + 1 < totalPages,
        hasPrevious: resolvedPage > 0,
      };
    }),
  };

  vi.mocked(core.recurrenceCreateRecurringMovement).mockImplementation(async (input) => {
    const id = `rec-${scheduledMovements.length + 1}`;
    const scheduleKind = 'scheduleKind' in input
      && (input.scheduleKind === 'one_shot' || input.scheduleKind === 'recurring')
      ? input.scheduleKind
      : undefined;
    const scheduledKind = resolveSchedulingKind({
      recurrenceEnd: input.recurrenceEnd,
      scheduleKind,
    });
    scheduledMovements.push({
      id,
      type: input.type,
      sourceAccountId: input.sourceAccountId,
      targetAccountId: input.targetAccountId,
      amount: input.amount,
      currency: input.currency,
      destinationAmount: input.destinationAmount,
      destinationCurrency: input.destinationCurrency,
      exchangeRate: input.exchangeRate,
      description: input.description,
      merchant: input.merchant,
      categoryId: input.categoryId,
      tagIds: input.tagIds,
      tagNames: input.tagNames,
      splitItems: (input.splitItems ?? []).map((item: { id: string; name: string; amount: string }) => ({ ...item })),
      status: 'active',
      startAt: input.startAt,
      nextDueAt: input.startAt,
      zoneId: input.zoneId,
      generatedOccurrences: 0,
      rule: input.rule,
      recurrenceEnd: input.recurrenceEnd,
      scheduleKind: scheduledKind,
      origin: scheduledKind,
    });
    return { id };
  });
  vi.mocked(core.recurrenceDeactivateRecurringMovement).mockImplementation(async (input) => {
    const movement = scheduledMovements.find((item) => item.id === input.recurringMovementId);
    if (movement) {
      movement.status = 'deactivated';
      movement.nextDueAt = undefined;
    }
  });
  vi.mocked(core.recurrenceListRecurringMovements).mockImplementation(async (input) => ({
    items: scheduledMovements.filter((item) => isScheduledVisibleForAccount(item, input.sourceAccountId)),
  }));

  return core;
}

async function openMode(mode: 'Expense' | 'Income' | 'Transfer') {
  fireEvent.click(screen.getByRole('button', { name: 'Add movement' }));
  fireEvent.click(await screen.findByRole('button', { name: mode }));
}

async function expandExpectedMovements() {
  fireEvent.click(await screen.findByRole('button', { name: /Expand expected movements/i }));
}

async function expandScheduledMovements() {
  fireEvent.click(await screen.findByRole('button', { name: /Expand scheduled movements/i }));
}

async function openImportSheetFromAccounts() {
  fireEvent.click(await screen.findByRole('button', { name: 'Main' }));
  await screen.findByRole('dialog', { name: 'Select account' });
  fireEvent.click(screen.getByRole('button', { name: 'Import transactions' }));
}

describe('App Accounts UX', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows selected account menu inline with account summary', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    expect(await screen.findByText('Net balance')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Main' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('shows import action inside accounts menu when accounts exist', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    fireEvent.click(await screen.findByRole('button', { name: 'Main' }));
    expect(await screen.findByRole('button', { name: 'Import transactions' })).toBeInTheDocument();
  });

  it('opens add account sheet from accounts menu', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    fireEvent.click(await screen.findByRole('button', { name: 'Main' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add account' }));

    const dialog = await screen.findByRole('dialog', { name: 'Create account' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveClass('import-sheet');
    expect(screen.getByRole('button', { name: 'Close add account sheet' })).toBeInTheDocument();
  });

  it('opens account management sheet from account controls', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    fireEvent.click(screen.getByRole('button', { name: 'Account settings' }));
    expect(await screen.findByRole('dialog', { name: 'Manage account' })).toBeInTheDocument();
  });

  it('renames current account from management sheet', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    fireEvent.click(screen.getByRole('button', { name: 'Account settings' }));
    fireEvent.change(await screen.findByLabelText('Manage account name'), { target: { value: 'Wallet renamed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));

    await waitFor(() => {
      expect(core.ledgerRenameAccount).toHaveBeenCalledTimes(1);
    });
    expect(core.ledgerRenameAccount).toHaveBeenCalledWith({
      accountId: 'acc-1',
      name: 'Wallet renamed',
    });
  });

  it('archives current account from management sheet after confirmation', async () => {
    const core = makeCore();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    fireEvent.click(screen.getByRole('button', { name: 'Account settings' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Archive account' }));

    await waitFor(() => {
      expect(core.ledgerArchiveAccount).toHaveBeenCalledTimes(1);
    });
    expect(confirmSpy).toHaveBeenCalled();
    expect(core.ledgerArchiveAccount).toHaveBeenCalledWith({
      accountId: 'acc-1',
    });
  });

  it('deletes current account from management sheet after confirmation', async () => {
    const core = makeCore();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    fireEvent.click(screen.getByRole('button', { name: 'Account settings' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete account' }));

    await waitFor(() => {
      expect(core.ledgerDeleteAccount).toHaveBeenCalledTimes(1);
    });
    expect(confirmSpy).toHaveBeenCalled();
    expect(core.ledgerDeleteAccount).toHaveBeenCalledWith({
      accountId: 'acc-1',
    });
  });

  it('does not delete account when confirmation is canceled', async () => {
    const core = makeCore();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    fireEvent.click(screen.getByRole('button', { name: 'Account settings' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete account' }));

    expect(core.ledgerDeleteAccount).not.toHaveBeenCalled();
  });

  it('shows import action in empty state when no accounts exist', async () => {
    const core = makeCore();
    vi.mocked(core.ledgerListAccounts).mockResolvedValueOnce({ items: [] });

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Create your first account' });
    expect(screen.getByRole('button', { name: 'Import from Mobills' })).toBeInTheDocument();
  });

  it('opens and closes the mobills import sheet', async () => {
    const core = makeCore();

    const view = render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openImportSheetFromAccounts();
    const dialog = await screen.findByRole('dialog', { name: 'Import transactions' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveClass('import-sheet');
    expect(view.container.querySelector('.import-sheet-content')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Close import sheet' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Import transactions' })).not.toBeInTheDocument();
    });
  });

  it('allows csv files in the mobills picker', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openImportSheetFromAccounts();

    const fileInput = await screen.findByLabelText('Import file (TSV/CSV)');
    expect(fileInput).toHaveAttribute('accept', expect.stringContaining('.csv'));
  });

  it('imports a mobills file and shows the summary', async () => {
    const core = makeCore();
    vi.mocked(core.mobillsImport).mockResolvedValueOnce({
      totalRows: 4,
      importedCount: 3,
      failedCount: 1,
      skippedCount: 0,
      rows: [
        { sourceLine: 2, status: 'imported', transactionId: 'tx-1' },
        { sourceLine: 3, status: 'failed', errorCode: 'INVALID_VALUE', errorMessage: 'Cannot parse value' },
      ],
    });

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openImportSheetFromAccounts();

    const fileInput = await screen.findByLabelText('Import file (TSV/CSV)');
    const file = new File(
      ['date\taccount\tvalue\n2026-03-10\tMain\t-10'],
      'mobills.tsv',
      { type: 'text/tab-separated-values' },
    );
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Import file' }));

    await waitFor(() => {
      expect(core.mobillsImport).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText('Imported 3 / 4 rows')).toBeInTheDocument();
    expect(screen.getByText('1 failed')).toBeInTheDocument();
    expect(screen.getByText('Failure reasons')).toBeInTheDocument();
    expect(screen.getByText('Invalid value: 1')).toBeInTheDocument();
    expect(screen.getByText('Line 3 (INVALID_VALUE): Cannot parse value')).toBeInTheDocument();
  });

  it('shows account-not-found hint when missing accounts are the failure reason', async () => {
    const core = makeCore();
    vi.mocked(core.mobillsImport).mockResolvedValueOnce({
      totalRows: 2,
      importedCount: 0,
      failedCount: 2,
      skippedCount: 0,
      rows: [
        {
          sourceLine: 2,
          status: 'failed',
          errorCode: 'ACCOUNT_NOT_FOUND_BILLETERA_EUR',
          errorMessage: 'ACCOUNT_NOT_FOUND:Billetera:EUR',
        },
        {
          sourceLine: 3,
          status: 'failed',
          errorCode: 'ACCOUNT_NOT_FOUND_CASH_USD',
          errorMessage: 'ACCOUNT_NOT_FOUND:Cash:USD',
        },
      ],
    });

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openImportSheetFromAccounts();

    const fileInput = await screen.findByLabelText('Import file (TSV/CSV)');
    const file = new File(
      ['date\taccount\tvalue\n2026-03-10\tMain\t-10'],
      'mobills.tsv',
      { type: 'text/tab-separated-values' },
    );
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Import file' }));

    await waitFor(() => {
      expect(core.mobillsImport).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('Missing account: 2')).toBeInTheDocument();
    expect(
      screen.getByText(/many rows failed because account names were not found/i),
    ).toBeInTheDocument();
  });

  it('uses selected import policy flags when importing', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openImportSheetFromAccounts();

    const fileInput = await screen.findByLabelText('Import file (TSV/CSV)');
    const file = new File(
      ['date\taccount\tvalue\n2026-03-10\tMain\t-10'],
      'mobills.tsv',
      { type: 'text/tab-separated-values' },
    );
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByLabelText('Create missing categories'));
    fireEvent.click(screen.getByLabelText('Create missing tags'));
    fireEvent.click(screen.getByRole('button', { name: 'Import file' }));

    await waitFor(() => {
      expect(core.mobillsImport).toHaveBeenCalledTimes(1);
    });

    const call = vi.mocked(core.mobillsImport).mock.calls[0];
    expect(call?.[0]).toEqual({
      fileBase64: expect.any(String),
      policy: {
        createMissingAccounts: true,
        createMissingCategories: false,
        createMissingTags: false,
        duplicatePolicy: 'skip',
      },
    });
  });

  it('defaults create-missing-accounts to enabled when importing from empty state', async () => {
    const core = makeCore();
    vi.mocked(core.ledgerListAccounts).mockResolvedValue({ items: [] });

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Create your first account' });
    fireEvent.click(screen.getByRole('button', { name: 'Import from Mobills' }));

    const fileInput = await screen.findByLabelText('Import file (TSV/CSV)');
    const file = new File(
      ['date\taccount\tvalue\n2026-03-10\tMain\t-10'],
      'mobills.tsv',
      { type: 'text/tab-separated-values' },
    );
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Import file' }));

    await waitFor(() => {
      expect(core.mobillsImport).toHaveBeenCalledTimes(1);
    });

    const call = vi.mocked(core.mobillsImport).mock.calls[0];
    expect(call?.[0]).toEqual({
      fileBase64: expect.any(String),
      policy: {
        createMissingAccounts: true,
        createMissingCategories: true,
        createMissingTags: true,
        duplicatePolicy: 'skip',
      },
    });
  });

  it('uses selected duplicate policy when importing', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openImportSheetFromAccounts();

    const fileInput = await screen.findByLabelText('Import file (TSV/CSV)');
    const file = new File(
      ['date\taccount\tvalue\n2026-03-10\tMain\t-10'],
      'mobills.tsv',
      { type: 'text/tab-separated-values' },
    );
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.change(screen.getByLabelText('Duplicate transactions'), { target: { value: 'fail' } });
    fireEvent.click(screen.getByRole('button', { name: 'Import file' }));

    await waitFor(() => {
      expect(core.mobillsImport).toHaveBeenCalledTimes(1);
    });

    const call = vi.mocked(core.mobillsImport).mock.calls[0];
    expect(call?.[0]).toEqual({
      fileBase64: expect.any(String),
      policy: {
        createMissingAccounts: true,
        createMissingCategories: true,
        createMissingTags: true,
        duplicatePolicy: 'fail',
      },
    });
  });

  it('shows import failure in sheet when import fails', async () => {
    const core = makeCore();
    vi.mocked(core.mobillsImport).mockRejectedValueOnce(new Error('Import failed hard'));

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openImportSheetFromAccounts();

    const fileInput = await screen.findByLabelText('Import file (TSV/CSV)');
    const file = new File(
      ['date\taccount\tvalue\n2026-03-10\tMain\t-10'],
      'mobills.tsv',
      { type: 'text/tab-separated-values' },
    );
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Import file' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Import failed hard');
    expect(screen.getByRole('dialog', { name: 'Import transactions' })).toBeInTheDocument();
  });

  it('records quick expense from dedicated expense flow', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Expense');

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '12.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(core.ledgerRecordExpense).toHaveBeenCalledTimes(1);
    });
  });

  it('refreshes recent transactions after saving a movement', async () => {
    const core = makeCore();
    const transactions: LedgerTransactionListItem[] = [
      {
        id: 'tx-seed',
        accountId: 'acc-1',
        occurredAt: isoInCurrentMonth(10, 9),
        description: 'Seed movement',
        merchant: 'Seed merchant',
        amount: '9.00',
        currency: 'USD',
        type: 'expense',
        status: 'posted',
        items: [],
      },
    ];

    vi.mocked(core.ledgerListTransactions).mockImplementation(async (input) => toPagedResult([...transactions], input));
    vi.mocked(core.ledgerRecordExpense).mockImplementation(async () => {
      transactions.unshift({
        id: 'tx-new',
        accountId: 'acc-1',
        occurredAt: isoInCurrentMonth(10, 10),
        description: 'New movement',
        merchant: 'Auto refresh merchant',
        amount: '12.50',
        currency: 'USD',
        type: 'expense',
        status: 'posted',
        items: [],
      });
      return { id: 'tx-new' };
    });

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Movements' });
    await waitFor(() => {
      expect(core.ledgerListTransactions).toHaveBeenCalledTimes(1);
    });

    await openMode('Expense');
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '12.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(core.ledgerRecordExpense).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(core.ledgerListTransactions).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText('Auto refresh merchant')).toBeInTheDocument();
  });

  it('refreshes account balance after saving a movement', async () => {
    const core = makeCore();
    let currentBalance = '100.00';

    vi.mocked(core.ledgerGetAccountSummary).mockImplementation(async () => ({
      accountId: 'acc-1',
      name: 'Main',
      type: 'cash',
      currency: 'USD',
      balanceAmount: currentBalance,
    }));
    vi.mocked(core.ledgerRecordExpense).mockImplementation(async () => {
      currentBalance = '87.50';
      return { id: 'tx-exp' };
    });

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    expect(screen.getByText(/\$100\.00/)).toBeInTheDocument();

    await openMode('Expense');
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '12.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(core.ledgerRecordExpense).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByText(/\$87\.50/)).toBeInTheDocument();
    });
  });

  it('uses current time when submitting a date-only transaction', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Expense');
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-03-10' } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(core.ledgerRecordExpense).toHaveBeenCalledTimes(1);
    });

    const [firstCall] = vi.mocked(core.ledgerRecordExpense).mock.calls;
    expect(firstCall?.[0].occurredAt.startsWith('2026-03-10T')).toBe(true);
    expect(firstCall?.[0].occurredAt.endsWith('Z')).toBe(true);
  });

  it('creates a scheduled one-time expense when date is in the future', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Expense');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2099-12-31' } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(core.recurrenceCreateRecurringMovement).toHaveBeenCalledTimes(1);
    });
    expect(core.ledgerRecordExpense).not.toHaveBeenCalled();
  });

  it('creates a future expected income instead of scheduling it', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Income');
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '1200' } });
    fireEvent.change(screen.getByLabelText('Source'), { target: { value: 'Client invoice' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2099-12-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByLabelText('Expected'));
    fireEvent.click(screen.getByRole('button', { name: 'Save expected' }));

    await waitFor(() => {
      expect(core.expectedCreateMovement).toHaveBeenCalledTimes(1);
    });
    expect(core.expectedCreateMovement).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 'acc-1',
      type: 'income',
      amount: '1200.00',
      currency: 'USD',
      expectedAt: expect.stringMatching(/^2099-12-31T/),
      description: 'Client invoice',
      merchant: 'Client invoice',
    }));
    expect(core.recurrenceCreateRecurringMovement).not.toHaveBeenCalled();
    expect(core.ledgerRecordIncome).not.toHaveBeenCalled();
  });

  it('allows expected and recurring together from composer', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Expense');
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '55' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-05-04' } });
    fireEvent.change(screen.getByLabelText('Merchant'), { target: { value: 'Gym' } });
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByLabelText('Expected'));
    fireEvent.click(screen.getByLabelText('Repeat this expense'));
    fireEvent.click(screen.getByRole('button', { name: 'Save expected' }));

    await waitFor(() => {
      expect(core.expectedCreateMovement).toHaveBeenCalledTimes(1);
      expect(core.recurrenceCreateRecurringMovement).toHaveBeenCalledTimes(1);
    });

    expect(core.expectedCreateMovement).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 'acc-1',
      type: 'expense',
      amount: '55.00',
      currency: 'USD',
      expectedAt: expect.stringMatching(/^2026-05-04T/),
      merchant: 'Gym',
      description: 'Gym',
    }));
    expect(core.recurrenceCreateRecurringMovement).toHaveBeenCalledWith(expect.objectContaining({
      type: 'expense',
      sourceAccountId: 'acc-1',
      amount: '55.00',
      currency: 'USD',
      scheduleKind: 'recurring',
      recurrenceEnd: { kind: 'never' },
    }));
    expect(core.ledgerRecordExpense).not.toHaveBeenCalled();
  });

  it('categorizes quick expense with an existing category', async () => {
    const core = makeCore();
    const view = render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Expense');
    expect(screen.queryByLabelText('Category')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    expect(view.container.querySelector('datalist option[value="Food"]')).not.toBeNull();
    expect(view.container.querySelector('datalist option[value="Salary"]')).not.toBeNull();

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '12.5' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Food' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(core.ledgerRecordExpense).toHaveBeenCalledTimes(1);
      expect(core.orchestrationCategorizeTransaction).toHaveBeenCalledTimes(1);
    });
    expect(core.orchestrationCategorizeTransaction).toHaveBeenCalledWith({
      transactionId: 'tx-exp',
      transactionType: 'expense',
      categoryId: 'cat-food',
    });
  });

  it('creates and uses a new category when expense selects create option', async () => {
    const core = makeCore();
    vi.mocked(core.taxonomyListCategories).mockResolvedValueOnce({ items: [] });
    vi.mocked(core.taxonomyCreateCategory).mockResolvedValueOnce({ id: 'cat-new-expense' });

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Expense');
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '35' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Dining out' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(core.taxonomyCreateCategory).toHaveBeenCalledTimes(1);
      expect(core.orchestrationCategorizeTransaction).toHaveBeenCalledTimes(1);
    });

    expect(core.taxonomyCreateCategory).toHaveBeenCalledWith({
      name: 'Dining out',
      appliesTo: 'expense',
    });
    expect(core.orchestrationCategorizeTransaction).toHaveBeenCalledWith({
      transactionId: 'tx-exp',
      transactionType: 'expense',
      categoryId: 'cat-new-expense',
    });
  });

  it('refreshes categories from backend when opening transaction composer', async () => {
    const core = makeCore();
    const travelCategories = {
      items: [{ id: 'cat-travel', name: 'Travel', appliesTo: 'expense' as const, status: 'active' as const }],
    };
    vi.mocked(core.taxonomyListCategories)
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValue(travelCategories);

    const view = render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Expense');
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));

    await waitFor(() => {
      expect(vi.mocked(core.taxonomyListCategories).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    expect(view.container.querySelector('datalist option[value="Travel"]')).not.toBeNull();
  });

  it('records income from dedicated income flow', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Income');

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(core.ledgerRecordIncome).toHaveBeenCalledTimes(1);
    });
  });

  it('supports detailed income with items using draft flow', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Income');

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Split into items' }));

    fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'Bonus' } });
    fireEvent.change(screen.getByLabelText('Item amount'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    fireEvent.click(screen.getByRole('button', { name: 'Assign remaining' }));

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(core.ledgerCreateExpenseDraft).toHaveBeenCalledTimes(1);
      expect(core.ledgerAddTransactionItem).toHaveBeenCalledTimes(2);
      expect(core.ledgerPostDraftTransaction).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(core.ledgerCreateExpenseDraft).mock.calls[0]?.[0]).toMatchObject({
      type: 'income',
    });
  });

  it('shows tags input only in advanced options', async () => {
    const core = makeCore();
    const view = render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Expense');
    expect(screen.queryByLabelText('Tags')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    expect(screen.getByLabelText('Tags')).toBeInTheDocument();
    expect(view.container.querySelector('datalist option[value="home"]')).not.toBeNull();
    expect(view.container.querySelector('datalist option[value="london"]')).not.toBeNull();
  });

  it('applies tags when saving expense with typed tags', async () => {
    const core = makeCore();
    vi.mocked(core.taxonomyListTags).mockResolvedValueOnce({
      items: [{ id: 'tag-london', name: 'london', status: 'active' as const }],
    });

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Expense');
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Tags'), { target: { value: 'london, trip-2026, london' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(core.orchestrationApplyTransactionTags).toHaveBeenCalledTimes(1);
    });
    expect(core.orchestrationApplyTransactionTags).toHaveBeenCalledWith({
      transactionId: 'tx-exp',
      tagNames: ['london', 'trip-2026'],
    });
  });

  it('applies tags to both transfer sides', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Transfer');
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Destination account'), { target: { value: 'acc-2' } });
    fireEvent.change(screen.getByLabelText('Tags'), { target: { value: 'trip, shared' } });
    const saveTransferButton = screen.getByRole('button', { name: 'Save' });
    const transferForm = saveTransferButton.closest('form');
    expect(transferForm).not.toBeNull();
    fireEvent.submit(transferForm!);

    await waitFor(() => {
      expect(core.orchestrationApplyTransactionTags).toHaveBeenCalledTimes(2);
    });
    expect(core.orchestrationApplyTransactionTags).toHaveBeenNthCalledWith(1, {
      transactionId: 'tx-tr-out',
      tagNames: ['trip', 'shared'],
    });
    expect(core.orchestrationApplyTransactionTags).toHaveBeenNthCalledWith(2, {
      transactionId: 'tx-tr-in',
      tagNames: ['trip', 'shared'],
    });
  });

  it('records transfer from dedicated transfer flow', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Transfer');

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.change(screen.getByLabelText('Destination account'), { target: { value: 'acc-2' } });
    const saveTransferButton = screen.getByRole('button', { name: 'Save' });
    const transferForm = saveTransferButton.closest('form');
    expect(transferForm).not.toBeNull();
    fireEvent.submit(transferForm!);

    await waitFor(() => {
      expect(core.ledgerRecordTransfer).toHaveBeenCalledTimes(1);
    });
  });

  it('records cross-currency transfer through FX command', async () => {
    const core = makeCore();
    vi.mocked(core.ledgerListAccounts).mockResolvedValue({
      items: [
        {
          id: 'acc-1',
          name: 'Main USD',
          type: 'cash',
          currency: 'USD',
          status: 'active',
        },
        {
          id: 'acc-2',
          name: 'Savings EUR',
          type: 'savings',
          currency: 'EUR',
          status: 'active',
        },
      ],
    });
    vi.mocked(core.ledgerGetAccountSummary).mockResolvedValue({
      accountId: 'acc-1',
      name: 'Main USD',
      type: 'cash',
      currency: 'USD',
      balanceAmount: '100.00',
    });

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Transfer');

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.change(screen.getByLabelText('Destination account'), { target: { value: 'acc-2' } });
    fireEvent.change(screen.getByLabelText(/FX rate/), { target: { value: '0.9' } });

    expect(screen.getByLabelText('Amount in (EUR)')).toHaveValue(9);

    const saveTransferButton = screen.getByRole('button', { name: 'Save' });
    const transferForm = saveTransferButton.closest('form');
    expect(transferForm).not.toBeNull();
    fireEvent.submit(transferForm!);

    await waitFor(() => {
      expect(core.ledgerRecordTransferFx).toHaveBeenCalledTimes(1);
    });
    expect(core.ledgerRecordTransfer).toHaveBeenCalledTimes(0);
    expect(core.ledgerRecordTransferFx).toHaveBeenCalledWith({
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      occurredAt: expect.any(String),
      sourceAmount: '10.00',
      sourceCurrency: 'USD',
      destinationAmount: '9.00',
      destinationCurrency: 'EUR',
      exchangeRate: '0.9',
      description: undefined,
    });
  });

  it('recalculates FX rate when auto-rate mode is selected', async () => {
    const core = makeCore();
    vi.mocked(core.ledgerListAccounts).mockResolvedValue({
      items: [
        {
          id: 'acc-1',
          name: 'Main USD',
          type: 'cash',
          currency: 'USD',
          status: 'active',
        },
        {
          id: 'acc-2',
          name: 'Savings EUR',
          type: 'savings',
          currency: 'EUR',
          status: 'active',
        },
      ],
    });
    vi.mocked(core.ledgerGetAccountSummary).mockResolvedValue({
      accountId: 'acc-1',
      name: 'Main USD',
      type: 'cash',
      currency: 'USD',
      balanceAmount: '100.00',
    });

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Transfer');

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.change(screen.getByLabelText('Destination account'), { target: { value: 'acc-2' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Auto FX rate' }));
    fireEvent.change(screen.getByLabelText('Amount in (EUR)'), { target: { value: '8.50' } });

    expect(screen.getByLabelText(/FX rate/)).toHaveValue(0.85);

    const saveTransferButton = screen.getByRole('button', { name: 'Save' });
    const transferForm = saveTransferButton.closest('form');
    expect(transferForm).not.toBeNull();
    fireEvent.submit(transferForm!);

    await waitFor(() => {
      expect(core.ledgerRecordTransferFx).toHaveBeenCalledTimes(1);
    });
    expect(core.ledgerRecordTransferFx).toHaveBeenCalledWith({
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      occurredAt: expect.any(String),
      sourceAmount: '10.00',
      sourceCurrency: 'USD',
      destinationAmount: '8.50',
      destinationCurrency: 'EUR',
      exchangeRate: '0.85',
      description: undefined,
    });
  });

  it('keeps amount in read only when auto amount in mode is selected', async () => {
    const core = makeCore();
    vi.mocked(core.ledgerListAccounts).mockResolvedValue({
      items: [
        {
          id: 'acc-1',
          name: 'Main USD',
          type: 'cash',
          currency: 'USD',
          status: 'active',
        },
        {
          id: 'acc-2',
          name: 'Savings EUR',
          type: 'savings',
          currency: 'EUR',
          status: 'active',
        },
      ],
    });
    vi.mocked(core.ledgerGetAccountSummary).mockResolvedValue({
      accountId: 'acc-1',
      name: 'Main USD',
      type: 'cash',
      currency: 'USD',
      balanceAmount: '100.00',
    });

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Transfer');

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.change(screen.getByLabelText('Destination account'), { target: { value: 'acc-2' } });

    const amountIn = screen.getByLabelText('Amount in (EUR)');
    expect(amountIn).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: 'Auto amount in' }));
    expect(amountIn).toBeDisabled();
  });

  it('supports detailed expense with items using draft flow', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Expense');

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Split into items' }));

    fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'Groceries' } });
    fireEvent.change(screen.getByLabelText('Item amount'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    fireEvent.click(screen.getByRole('button', { name: 'Assign remaining' }));

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(core.ledgerCreateExpenseDraft).toHaveBeenCalledTimes(1);
      expect(core.ledgerAddTransactionItem).toHaveBeenCalledTimes(2);
      expect(core.ledgerPostDraftTransaction).toHaveBeenCalledTimes(1);
    });
  });

  it('updates split totals while adding and editing items', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>,
    );

    await screen.findByText('Net balance');
    await openMode('Expense');
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Split into items' }));

    fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'Water' } });
    fireEvent.change(screen.getByLabelText('Item amount'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));

    expect(screen.getByLabelText('Amount')).toHaveValue(20);

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'Electricity' } });
    fireEvent.change(screen.getByLabelText('Item amount'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));

    expect(screen.getByLabelText('Amount')).toHaveValue(60);

    const waterItem = screen.getByText('Water').closest('li');
    expect(waterItem).not.toBeNull();
    fireEvent.click(within(waterItem!).getByRole('button', { name: 'Edit' }));

    expect(screen.getByLabelText('Item name')).toHaveValue('Water');
    expect(screen.getByLabelText('Item amount')).toHaveValue(20);

    fireEvent.change(screen.getByLabelText('Item amount'), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));

    expect(screen.getByLabelText('Amount')).toHaveValue(65);
    expect(screen.getByText('25.00')).toBeInTheDocument();

    const electricityItem = screen.getByText('Electricity').closest('li');
    expect(electricityItem).not.toBeNull();
    fireEvent.click(within(electricityItem!).getByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Amount')).toHaveValue(25);
    });
    expect(screen.queryByText('Electricity')).not.toBeInTheDocument();
  });

  it('keeps detailed expense publish disabled until split reaches zero', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Expense');

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Split into items' }));

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'Groceries' } });
    fireEvent.change(screen.getByLabelText('Item amount'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    expect(saveButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Assign remaining' }));
    expect(saveButton).toBeEnabled();
  });

  it('closes the composer after expense save even when refresh fails', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    vi.mocked(core.ledgerListAccounts).mockRejectedValueOnce(new Error('refresh failed'));
    await openMode('Expense');

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '12.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(core.ledgerRecordExpense).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Transaction composer' })).not.toBeInTheDocument();
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('refresh failed');
  });

  it('voids a transaction after undo window expires', async () => {
    const core = makeCore(1);

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Movements' });
    const movementRow = await screen.findByText('Merchant 1');
    fireEvent.click(movementRow.closest('button')!);
    const detailDialog = await screen.findByRole('dialog', { name: 'Transaction details' });
    vi.useFakeTimers();
    fireEvent.click(within(detailDialog).getByRole('button', { name: 'Void movement' }));
    expect(core.ledgerVoidTransaction).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(5000);
    await Promise.resolve();
    expect(core.ledgerVoidTransaction).toHaveBeenCalledTimes(1);
  });

  it('allows undo before a void is committed', async () => {
    const core = makeCore(1);

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Movements' });
    const movementRow = await screen.findByText('Merchant 1');
    fireEvent.click(movementRow.closest('button')!);
    const detailDialog = await screen.findByRole('dialog', { name: 'Transaction details' });
    vi.useFakeTimers();
    fireEvent.click(within(detailDialog).getByRole('button', { name: 'Void movement' }));

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('status')).toHaveTextContent('Void canceled.');
    await vi.advanceTimersByTimeAsync(5000);
    expect(core.ledgerVoidTransaction).toHaveBeenCalledTimes(0);
  });

  it('renders transaction category, tags and time using taxonomy assignments', async () => {
    const core = makeCore(1);
    const listTransactionTaxonomy = vi.fn(async () => ({
      items: [
        {
          transactionId: 'tx-1',
          categoryId: 'cat-food',
          tagIds: ['tag-home', 'tag-london'],
          categorizationStatus: 'assigned',
          taggingStatus: 'assigned',
        },
      ],
    }));
    (core as unknown as { orchestrationListTransactionTaxonomy: typeof listTransactionTaxonomy })
      .orchestrationListTransactionTaxonomy = listTransactionTaxonomy;

    vi.mocked(core.ledgerListTransactions).mockResolvedValueOnce({
      content: [
        {
          id: 'tx-1',
          accountId: 'acc-1',
          occurredAt: isoInCurrentMonth(6, 9, 41),
          description: 'Breakfast',
          merchant: 'Cafe',
          amount: '8.50',
          currency: 'USD',
          type: 'expense',
          status: 'posted',
          items: [],
        },
      ],
      page: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    });

    const view = render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Movements' });

    await waitFor(() => {
      expect(listTransactionTaxonomy).toHaveBeenCalledWith({ transactionIds: ['tx-1'] });
    });

    expect(screen.getByText(/Food/)).toBeInTheDocument();
    expect(screen.getByText(/#home/)).toBeInTheDocument();
    expect(screen.getByText(/#london/)).toBeInTheDocument();

    const timeElements = [...view.container.querySelectorAll('time')];
    expect(timeElements).toHaveLength(0);
  });

  it('shows advanced-search entry on hub', async () => {
    const coreWithMoreThanThree = makeCore(5);

    render(
      <MemoryRouter>
        <App required={{ core: coreWithMoreThanThree }} />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Movements' });
    expect(screen.getByRole('link', { name: 'Search movements' })).toBeInTheDocument();
  });

  it('links to advanced search with the current account id', async () => {
    const coreWithThree = makeCore(3);

    render(
      <MemoryRouter>
        <App required={{ core: coreWithThree }} />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Movements' });
    expect(screen.getByRole('link', { name: 'Search movements' })).toHaveAttribute(
      'href',
      '/movements/search?accountId=acc-1',
    );
  });

  it('updates advanced-search link when switching account', async () => {
    const coreWithThree = makeCore(3);

    render(
      <MemoryRouter>
        <App required={{ core: coreWithThree }} />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Movements' });
    expect(screen.getByRole('link', { name: 'Search movements' })).toHaveAttribute(
      'href',
      '/movements/search?accountId=acc-1',
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Main' }));
    await screen.findByRole('dialog', { name: 'Select account' });
    fireEvent.click(screen.getByRole('button', { name: /Savings/ }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Search movements' })).toHaveAttribute(
        'href',
        '/movements/search?accountId=acc-2',
      );
    });
  });

  it('shows compact advanced-search header with close action', async () => {
    const core = makeCore(3);

    render(
      <MemoryRouter initialEntries={['/movements/search?accountId=acc-1']}>
        <App required={{ core }} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Close search' })).toHaveAttribute('href', '/');
    expect(screen.queryByText('Back to movements')).not.toBeInTheDocument();
    expect(screen.queryByText('Search posted or scheduled movements in one list.')).not.toBeInTheDocument();
  });

  it('opens advanced-search filters in a sheet instead of expanding them inline', async () => {
    const core = makeCore(3);

    render(
      <MemoryRouter initialEntries={['/movements/search?accountId=acc-1']}>
        <App required={{ core }} />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Search' });
    await screen.findByText('3 movements · Grouped by day · Date desc');
    expect(screen.queryByRole('button', { name: 'More filters' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));

    const filtersDialog = await screen.findByRole('dialog', { name: 'Filters' });
    expect(within(filtersDialog).getAllByText('Date').length).toBeGreaterThan(0);
    expect(within(filtersDialog).getByText('Type')).toBeInTheDocument();
    expect(within(filtersDialog).getByText('Category')).toBeInTheDocument();
    expect(within(filtersDialog).getAllByText('Amount').length).toBeGreaterThan(0);
    expect(within(filtersDialog).getByText('Tags')).toBeInTheDocument();
    expect(within(filtersDialog).getByText('Group')).toBeInTheDocument();
    expect(within(filtersDialog).getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });

  it('groups date-sorted advanced-search results by day', async () => {
    const core = makeCore(3);

    render(
      <MemoryRouter initialEntries={['/movements/search?accountId=acc-1']}>
        <App required={{ core }} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('3 movements · Grouped by day · Date desc')).toBeInTheDocument();
    expect(screen.getAllByRole('list', { name: /Movement results/ })).toHaveLength(3);
  });

  it('uses a flat advanced-search list when sorting by amount', async () => {
    const core = makeCore(3);

    render(
      <MemoryRouter initialEntries={['/movements/search?accountId=acc-1']}>
        <App required={{ core }} />
      </MemoryRouter>,
    );

    await screen.findByText('3 movements · Grouped by day · Date desc');
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    const filtersDialog = await screen.findByRole('dialog', { name: 'Filters' });
    fireEvent.click(within(filtersDialog).getByRole('button', { name: 'Amount' }));
    fireEvent.click(within(filtersDialog).getByRole('button', { name: 'Apply' }));

    expect(await screen.findByText('3 movements · Amount desc')).toBeInTheDocument();
    expect(screen.getAllByRole('list', { name: 'Movement results' })).toHaveLength(1);
  });

  it('shows tag metadata on advanced-search cards and detail when filtering by tag', async () => {
    const core = makeCore(1);
    core.movementsSearch = vi.fn(async (input: MovementsSearchInput): Promise<MovementsSearchResult> => ({
      content: [
        {
          id: 'tx-1',
          source: 'posted',
          type: 'expense',
          status: 'posted',
          amount: '1.00',
          currency: 'USD',
          occurredAt: isoInCurrentMonth(1, 9, 0),
          title: 'Merchant 1',
          description: 'Description 1',
          merchant: 'Merchant 1',
        },
      ],
      page: input.pagination?.page ?? 0,
      size: input.pagination?.size ?? 10,
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    }));
    const listTransactionTaxonomy = vi.fn(async () => ({
      items: [
        {
          transactionId: 'tx-1',
          categoryId: undefined,
          tagIds: ['tag-home'],
          categorizationStatus: 'none' as const,
          taggingStatus: 'assigned' as const,
        },
      ],
    }));
    (core as unknown as { orchestrationListTransactionTaxonomy: typeof listTransactionTaxonomy })
      .orchestrationListTransactionTaxonomy = listTransactionTaxonomy;

    render(
      <MemoryRouter initialEntries={['/movements/search?accountId=acc-1']}>
        <App required={{ core }} />
      </MemoryRouter>,
    );

    await screen.findByText('1 movement · Grouped by day · Date desc');
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    const filtersDialog = await screen.findByRole('dialog', { name: 'Filters' });
    fireEvent.click(within(filtersDialog).getByRole('button', { name: '#home' }));
    fireEvent.click(within(filtersDialog).getByRole('button', { name: 'Apply' }));

    expect(await screen.findByText('#home')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Merchant 1'));
    const detailDialog = await screen.findByRole('dialog', { name: 'Movement details' });
    expect(within(detailDialog).getByText('#home')).toBeInTheDocument();
  });

  it('shows category metadata on advanced-search cards and detail when only category id is returned', async () => {
    const core = makeCore(1);
    core.movementsSearch = vi.fn(async (input: MovementsSearchInput): Promise<MovementsSearchResult> => ({
      content: [
        {
          id: 'tx-1',
          source: 'posted',
          type: 'expense',
          status: 'posted',
          amount: '1.00',
          currency: 'USD',
          occurredAt: isoInCurrentMonth(1, 9, 0),
          title: 'Merchant 1',
          description: 'Description 1',
          merchant: 'Merchant 1',
          categoryId: 'cat-food',
        },
      ],
      page: input.pagination?.page ?? 0,
      size: input.pagination?.size ?? 10,
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    }));

    render(
      <MemoryRouter initialEntries={['/movements/search?accountId=acc-1']}>
        <App required={{ core }} />
      </MemoryRouter>,
    );

    await screen.findByText('1 movement · Grouped by day · Date desc');
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    const filtersDialog = await screen.findByRole('dialog', { name: 'Filters' });
    fireEvent.click(within(filtersDialog).getByRole('button', { name: 'Food' }));
    fireEvent.click(within(filtersDialog).getByRole('button', { name: 'Apply' }));

    expect(await screen.findByText('Food')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Merchant 1'));
    const detailDialog = await screen.findByRole('dialog', { name: 'Movement details' });
    expect(within(detailDialog).getByText('Food')).toBeInTheDocument();
    await waitFor(() => {
      expect(core.movementsSearch).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            categoryId: 'cat-food',
            categoryIds: ['cat-food'],
          }),
          pagination: {
            page: 0,
            size: 100,
          },
        }),
      );
    });
  });

  it('shows split items in advanced-search details for posted movements', async () => {
    const core = makeCore(1);
    core.movementsSearch = vi.fn(async (input: MovementsSearchInput): Promise<MovementsSearchResult> => ({
      content: [
        {
          id: 'tx-1',
          source: 'posted',
          type: 'expense',
          status: 'posted',
          amount: '180.00',
          currency: 'USD',
          occurredAt: isoInCurrentMonth(1, 9, 0),
          title: 'Utilities',
          description: 'Monthly utilities',
          merchant: 'Utilities',
          items: [
            { id: 'item-1', name: 'Water', amount: '25.00' },
            { id: 'item-2', name: 'Electricity', amount: '55.00' },
            { id: 'item-3', name: 'Rent', amount: '90.00' },
          ],
        },
      ],
      page: input.pagination?.page ?? 0,
      size: input.pagination?.size ?? 10,
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    }));

    render(
      <MemoryRouter initialEntries={['/movements/search?accountId=acc-1']}>
        <App required={{ core }} />
      </MemoryRouter>,
    );

    await screen.findByText('1 movement · Grouped by day · Date desc');
    fireEvent.click(screen.getByText('Utilities'));

    const detailDialog = await screen.findByRole('dialog', { name: 'Movement details' });
    expect(within(detailDialog).getByText('Splits')).toBeInTheDocument();
    expect(within(detailDialog).getByText('Water')).toBeInTheDocument();
    expect(within(detailDialog).getByText('55.00')).toBeInTheDocument();
  });

  it('client-filters advanced-search posted results after taxonomy hydration when the adapter ignores category filters', async () => {
    const core = makeCore(2);
    core.movementsSearch = vi.fn(async (input: MovementsSearchInput): Promise<MovementsSearchResult> => ({
      content: [
        {
          id: 'tx-1',
          source: 'posted',
          type: 'expense',
          status: 'posted',
          amount: '1.00',
          currency: 'USD',
          occurredAt: isoInCurrentMonth(1, 9, 0),
          title: 'Merchant 1',
          merchant: 'Merchant 1',
        },
        {
          id: 'tx-2',
          source: 'posted',
          type: 'expense',
          status: 'posted',
          amount: '2.00',
          currency: 'USD',
          occurredAt: isoInCurrentMonth(2, 9, 0),
          title: 'Merchant 2',
          merchant: 'Merchant 2',
        },
      ],
      page: input.pagination?.page ?? 0,
      size: input.pagination?.size ?? 10,
      totalElements: 2,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    }));
    const listTransactionTaxonomy = vi.fn(async () => ({
      items: [
        {
          transactionId: 'tx-1',
          categoryId: 'cat-food',
          tagIds: [],
          categorizationStatus: 'assigned' as const,
          taggingStatus: 'none' as const,
        },
        {
          transactionId: 'tx-2',
          categoryId: undefined,
          tagIds: [],
          categorizationStatus: 'none' as const,
          taggingStatus: 'none' as const,
        },
      ],
    }));
    (core as unknown as { orchestrationListTransactionTaxonomy: typeof listTransactionTaxonomy })
      .orchestrationListTransactionTaxonomy = listTransactionTaxonomy;

    render(
      <MemoryRouter initialEntries={['/movements/search?accountId=acc-1']}>
        <App required={{ core }} />
      </MemoryRouter>,
    );

    await screen.findByText('2 movements · Grouped by day · Date desc');
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    const filtersDialog = await screen.findByRole('dialog', { name: 'Filters' });
    fireEvent.click(within(filtersDialog).getByRole('button', { name: 'Food' }));
    fireEvent.click(within(filtersDialog).getByRole('button', { name: 'Apply' }));

    expect(await screen.findByText('1 movement · Grouped by day · Date desc')).toBeInTheDocument();
    expect(screen.getByText('Merchant 1')).toBeInTheDocument();
    expect(screen.queryByText('Merchant 2')).not.toBeInTheDocument();
  });

  it('keeps hub monthly-focused without exposing advanced filter controls', async () => {
    const coreWithThree = makeCore(3);

    render(
      <MemoryRouter>
        <App required={{ core: coreWithThree }} />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Movements' });
    expect(screen.queryByRole('button', { name: 'More filters' })).not.toBeInTheDocument();
    const expectedSection = await screen.findByLabelText('Expected movements');
    expect(within(expectedSection).getByRole('heading', { name: 'Expected' })).toBeInTheDocument();
    expect(expectedSection).toHaveTextContent('0');
    const scheduledSection = await screen.findByLabelText('Scheduled movements');
    expect(within(scheduledSection).getByRole('heading', { name: 'Scheduled' })).toBeInTheDocument();
    expect(scheduledSection).toHaveTextContent('0');
    expect(screen.getByRole('heading', { name: 'Posted' })).toBeInTheDocument();
  });

  it('filters scheduled movements by the selected month', async () => {
    const core = makeCore();
    await core.schedulingCreateMovement({
      type: 'expense',
      sourceAccountId: 'acc-1',
      amount: '50.00',
      currency: 'USD',
      description: 'Scheduled movement',
      rule: { frequency: 'daily', interval: 1 },
      recurrenceEnd: { kind: 'after_occurrences', afterOccurrences: 1 },
      startAt: new Date().toISOString(),
      zoneId: 'UTC',
      scheduleKind: 'one_shot',
    });

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>,
    );

    await expandScheduledMovements();
    expect(await screen.findByText('Scheduled movement')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));

    await waitFor(() => {
      expect(screen.queryByText('Scheduled movement')).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Scheduled' })).not.toBeInTheDocument();
    expect(screen.queryByText(/No scheduled movements in/i)).not.toBeInTheDocument();
  });

  it('shows split items in posted movement details', async () => {
    const core = makeCore();
    const postedTransaction: LedgerTransactionListItem = {
      id: 'tx-posted-1',
      accountId: 'acc-1',
      type: 'expense',
      status: 'posted',
      amount: '42.00',
      currency: 'USD',
      occurredAt: isoInCurrentMonth(12, 12),
      description: 'House bill',
      merchant: 'House bill',
      categoryId: 'cat-food',
      category: { id: 'cat-food', name: 'Food' },
      tags: [],
      items: [
        { id: 'item-water', name: 'Water', amount: '12.00', currency: 'USD' },
        { id: 'item-electricity', name: 'Electricity', amount: '30.00', currency: 'USD' },
      ],
    };

    core.ledgerListTransactions = vi.fn(async () => ({
      content: [
        postedTransaction,
      ],
      page: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    }));

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>,
    );

    const postedRow = await screen.findByText('House bill');
    fireEvent.click(postedRow.closest('button')!);

    const detailDialog = await screen.findByRole('dialog', { name: 'Transaction details' });
    expect(within(detailDialog).getByText('Water')).toBeInTheDocument();
    expect(within(detailDialog).getByText('Electricity')).toBeInTheDocument();
  });

  it('posts an expected movement through a copy without editing the expected', async () => {
    const core = makeCore();
    await core.expectedCreateMovement({
      accountId: 'acc-1',
      type: 'expense',
      amount: '42.00',
      currency: 'USD',
      expectedAt: new Date().toISOString(),
      description: 'Expected rent',
      categoryId: 'cat-food',
      splitItems: [
        { id: 'split-water', name: 'Water', amount: '12.00' },
        { id: 'split-electricity', name: 'Electricity', amount: '30.00' },
      ],
    });

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>,
    );

    await expandExpectedMovements();
    const expectedRow = await screen.findByText('Expected rent');
    expect(screen.getByLabelText(/Expected group/i)).toHaveTextContent('Food');

    fireEvent.click(expectedRow.closest('button')!);
    const detailDialog = await screen.findByRole('dialog', { name: 'Expected movement details' });
    expect(within(detailDialog).getByText('Food')).toBeInTheDocument();
    expect(within(detailDialog).getByText('manual')).toBeInTheDocument();
    expect(within(detailDialog).getByText('pending')).toBeInTheDocument();
    expect(within(detailDialog).getByText('Water')).toBeInTheDocument();
    expect(within(detailDialog).getByText('Electricity')).toBeInTheDocument();

    fireEvent.click(within(detailDialog).getByRole('button', { name: 'Post movement' }));

    const composer = await screen.findByRole('dialog', { name: 'Transaction composer' });
    expect(within(composer).getByRole('heading', { name: 'Post expense' })).toBeInTheDocument();
    fireEvent.click(within(composer).getByRole('button', { name: 'Post movement' }));

    await waitFor(() => {
      expect(core.ledgerCreateExpenseDraft).toHaveBeenCalledWith(expect.objectContaining({
        accountId: 'acc-1',
        amount: '42.00',
        currency: 'USD',
        merchant: 'Expected rent',
        description: 'Expected rent',
      }));
    });
    expect(core.ledgerAddTransactionItem).toHaveBeenCalledTimes(2);
    expect(core.ledgerPostDraftTransaction).toHaveBeenCalledWith({
      transactionId: 'tx-draft',
    });
    await waitFor(() => {
      expect(core.expectedResolveMovement).toHaveBeenCalledWith(expect.objectContaining({
        expectedMovementId: 'exp-1',
        transactionId: 'tx-draft',
      }));
    });
    expect(core.expectedUpdateMovement).not.toHaveBeenCalled();
  });

  it('hides scheduled rows when the month already has the matching expected movement', async () => {
    const core = makeCore();
    const dueAt = '2026-05-12T10:00:00.000Z';

    await core.schedulingCreateMovement({
      type: 'expense',
      sourceAccountId: 'acc-1',
      amount: '33.00',
      currency: 'USD',
      description: 'Shared bill',
      categoryId: 'cat-food',
      rule: { frequency: 'daily', interval: 1 },
      recurrenceEnd: { kind: 'after_occurrences', afterOccurrences: 1 },
      startAt: dueAt,
      zoneId: 'UTC',
      scheduleKind: 'one_shot',
    });
    await core.expectedCreateMovement({
      accountId: 'acc-1',
      type: 'expense',
      amount: '33.00',
      currency: 'USD',
      expectedAt: dueAt,
      description: 'Shared bill',
      categoryId: 'cat-food',
      splitItems: [],
    });

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>,
    );

    await expandExpectedMovements();
    expect(await screen.findByText('Shared bill')).toBeInTheDocument();

    const scheduledSection = screen.getByLabelText('Scheduled movements');
    expect(within(scheduledSection).getByText('0')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Expand scheduled movements \(1\)/i })).not.toBeInTheDocument();
    expect(screen.getAllByText('Shared bill')).toHaveLength(1);
  });

  it('opens the composer with expected movement values for editing', async () => {
    const core = makeCore();
    await core.expectedCreateMovement({
      accountId: 'acc-1',
      type: 'expense',
      amount: '42.00',
      currency: 'USD',
      expectedAt: '2026-05-02T10:00:00.000Z',
      description: 'Expected rent',
      categoryId: 'cat-food',
      splitItems: [
        { id: 'split-water', name: 'Water', amount: '12.00' },
        { id: 'split-electricity', name: 'Electricity', amount: '30.00' },
      ],
    });

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>,
    );

    await expandExpectedMovements();
    const expectedRow = await screen.findByText('Expected rent');
    fireEvent.click(expectedRow.closest('button')!);
    const detailDialog = await screen.findByRole('dialog', { name: 'Expected movement details' });
    fireEvent.click(within(detailDialog).getByRole('button', { name: 'Edit expected' }));

    const composer = await screen.findByRole('dialog', { name: 'Transaction composer' });
    expect(within(composer).getByRole('heading', { name: 'New expense' })).toBeInTheDocument();
    expect(within(composer).getByLabelText('Amount')).toHaveValue(42);
    expect(within(composer).getByLabelText('Expected date')).toHaveValue('2026-05-02');
    expect(within(composer).getByLabelText('Merchant')).toHaveValue('Expected rent');
    expect(within(composer).getByLabelText('Category')).toHaveValue('Food');
    expect(within(composer).getByLabelText('Split into items')).toBeChecked();
    const splitItemsList = within(composer).getByRole('list', { name: 'Expense items' });
    expect(within(splitItemsList).getByText('Water')).toBeInTheDocument();
    expect(within(splitItemsList).getByText('Electricity')).toBeInTheDocument();
  });

  it('updates the same expected movement when editing and saving it', async () => {
    const core = makeCore();
    await core.expectedCreateMovement({
      accountId: 'acc-1',
      type: 'expense',
      amount: '42.00',
      currency: 'USD',
      expectedAt: '2026-05-02T10:00:00.000Z',
      description: 'Expected rent',
      categoryId: 'cat-food',
      splitItems: [
        { id: 'split-water', name: 'Water', amount: '12.00' },
        { id: 'split-electricity', name: 'Electricity', amount: '30.00' },
      ],
    });

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>,
    );

    await expandExpectedMovements();
    const expectedRow = await screen.findByText('Expected rent');
    fireEvent.click(expectedRow.closest('button')!);
    const detailDialog = await screen.findByRole('dialog', { name: 'Expected movement details' });
    fireEvent.click(within(detailDialog).getByRole('button', { name: 'Edit expected' }));

    const composer = await screen.findByRole('dialog', { name: 'Transaction composer' });
    fireEvent.click(within(composer).getByRole('button', { name: 'Save expected' }));

    await waitFor(() => {
      expect(core.expectedUpdateMovement).toHaveBeenCalledTimes(1);
    });
    expect(core.expectedCreateMovement).toHaveBeenCalledTimes(1);
    expect(core.expectedUpdateMovement).toHaveBeenCalledWith(expect.objectContaining({
      expectedMovementId: 'exp-1',
      accountId: 'acc-1',
      type: 'expense',
      amount: '42.00',
      currency: 'USD',
      categoryId: 'cat-food',
    }));

    const updated = await core.expectedListMovements({ accountId: 'acc-1' });
    expect(updated.items).toHaveLength(1);
    expect(updated.items[0].amount).toBe('42.00');
    expect(updated.items[0].id).toBe('exp-1');
  });

  it('dismisses an expected movement from the detail sheet', async () => {
    const core = makeCore();
    await core.expectedCreateMovement({
      accountId: 'acc-1',
      type: 'expense',
      amount: '42.00',
      currency: 'USD',
      expectedAt: '2026-05-02T10:00:00.000Z',
      description: 'Expected rent',
      categoryId: 'cat-food',
      splitItems: [
        { id: 'split-water', name: 'Water', amount: '12.00' },
        { id: 'split-electricity', name: 'Electricity', amount: '30.00' },
      ],
    });

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>,
    );

    await expandExpectedMovements();
    const expectedRow = await screen.findByText('Expected rent');
    fireEvent.click(expectedRow.closest('button')!);
    const detailDialog = await screen.findByRole('dialog', { name: 'Expected movement details' });
    fireEvent.click(within(detailDialog).getByRole('button', { name: 'Remove movement' }));

    await waitFor(() => {
      expect(core.expectedDismissMovement).toHaveBeenCalledTimes(1);
    });
    expect(core.expectedDismissMovement).toHaveBeenCalledWith(expect.objectContaining({
      expectedMovementId: 'exp-1',
    }));
    await waitFor(() => {
      expect(screen.queryByText('Expected rent')).not.toBeInTheDocument();
    });
  });

  it('shows scheduled transfer when switching to destination account', async () => {
    const core = makeCore();
    await core.schedulingCreateMovement({
      type: 'transfer',
      sourceAccountId: 'acc-1',
      targetAccountId: 'acc-2',
      amount: '50.00',
      currency: 'USD',
      description: 'Scheduled transfer',
      rule: { frequency: 'daily', interval: 1 },
      recurrenceEnd: { kind: 'after_occurrences', afterOccurrences: 1 },
      startAt: new Date().toISOString(),
      zoneId: 'UTC',
      scheduleKind: 'one_shot',
    });

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>,
    );

    await expandScheduledMovements();
    expect(await screen.findByText('Scheduled transfer')).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: 'Main' }));
    await screen.findByRole('dialog', { name: 'Select account' });
    fireEvent.click(screen.getByRole('button', { name: /Savings/ }));

    await expandScheduledMovements();
    expect(await screen.findByText('Scheduled transfer')).toBeInTheDocument();
  });

  it('creates recurring expense from composer more options', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Expense');
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '37.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-05-04' } });
    fireEvent.click(screen.getByLabelText('Repeat this expense'));
    fireEvent.change(screen.getByLabelText('Recurrence frequency'), { target: { value: 'monthly' } });
    fireEvent.change(screen.getByLabelText('Recurrence interval'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Monthly day of month'), { target: { value: '11' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(core.recurrenceCreateRecurringMovement).toHaveBeenCalledTimes(1);
    });

    const recurrenceCall = vi.mocked(core.recurrenceCreateRecurringMovement).mock.calls[0]?.[0];
    expect(recurrenceCall).toMatchObject({
      type: 'expense',
      sourceAccountId: 'acc-1',
      amount: '37.50',
      currency: 'USD',
      rule: {
        frequency: 'monthly',
        interval: 2,
        dayOfMonth: 11,
      },
      recurrenceEnd: { kind: 'never' },
      scheduleKind: 'recurring',
    });
    expect(core.ledgerRecordExpense).not.toHaveBeenCalled();
  });

  it('creates one-time scheduled expense from composer', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Expense');
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '25' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-05-11' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(core.recurrenceCreateRecurringMovement).toHaveBeenCalledTimes(1);
    });
    const scheduleCall = vi.mocked(core.recurrenceCreateRecurringMovement).mock.calls[0]?.[0];
    expect(scheduleCall).toMatchObject({
      type: 'expense',
      amount: '25.00',
      scheduleKind: 'one_shot',
      rule: {
        frequency: 'daily',
        interval: 1,
      },
      recurrenceEnd: {
        kind: 'after_occurrences',
        afterOccurrences: 1,
      },
    });
    expect(core.ledgerRecordExpense).not.toHaveBeenCalled();
  });

  it('lists recurring movements and allows deactivation', async () => {
    const core = makeCore();
    let isActive = true;

    const scheduledItem = {
      id: 'rec-1',
      type: 'expense' as const,
      sourceAccountId: 'acc-1',
      amount: '15.00',
      currency: 'USD',
      status: 'active' as const,
      startAt: '2026-05-01T10:00:00.000Z',
      nextDueAt: '2026-05-11T10:00:00.000Z',
      zoneId: 'UTC',
      generatedOccurrences: 0,
      splitItems: [],
      rule: { frequency: 'monthly' as const, interval: 1, monthlyPattern: 'day_of_month' as const, dayOfMonth: 11 },
      recurrenceEnd: { kind: 'never' as const },
      origin: 'recurring' as const,
      scheduleKind: 'recurring' as const,
    };

    core.movementsGetOverview = vi.fn(async () => ({
      scheduledPreview: {
        items: isActive
          ? [scheduledItem]
          : [{ ...scheduledItem, status: 'deactivated' as const, nextDueAt: undefined }],
        total: 1,
        hasMore: false,
      },
      expectedPreview: emptyExpectedPreview(),
      postedPage: {
        content: [],
        page: 0,
        size: 10,
        totalElements: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
      executedPage: {
        content: [],
        page: 0,
        size: 10,
        totalElements: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
    }));
    core.schedulingDeactivateMovement = vi.fn(async () => {
      isActive = false;
    });

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await expandScheduledMovements();
    const scheduledRow = await screen.findByText('Scheduled movement');
    fireEvent.click(scheduledRow.closest('button')!);
    const detailDialog = await screen.findByRole('dialog', { name: 'Scheduled movement details' });
    fireEvent.click(within(detailDialog).getByRole('button', { name: 'Deactivate movement' }));

    await waitFor(() => {
      expect(core.schedulingDeactivateMovement).toHaveBeenCalledWith({
        recurringMovementId: 'rec-1',
      });
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Scheduled movement details' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Scheduled movement deactivated.');
  });

  it('infers one-shot metadata for legacy scheduled items', async () => {
    const core = makeCore();
    const legacyScheduled: SchedulingMovementItem = {
      id: 'rec-legacy',
      type: 'expense',
      sourceAccountId: 'acc-1',
      amount: '18.00',
      currency: 'USD',
      status: 'active',
      startAt: '2026-05-10T10:00:00.000Z',
      nextDueAt: '2026-05-10T10:00:00.000Z',
      zoneId: 'UTC',
      generatedOccurrences: 0,
      splitItems: [],
      rule: { frequency: 'daily', interval: 1 },
      recurrenceEnd: { kind: 'after_occurrences', afterOccurrences: 1 },
    };

    core.movementsGetOverview = vi.fn(async () => ({
      scheduledPreview: {
        items: [legacyScheduled],
        total: 1,
        hasMore: false,
      },
      expectedPreview: emptyExpectedPreview(),
      postedPage: {
        content: [],
        page: 0,
        size: 10,
        totalElements: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
      executedPage: {
        content: [],
        page: 0,
        size: 10,
        totalElements: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
    }));

    render(
      <MemoryRouter>
        <App required={{ core }} />
      </MemoryRouter>
    );

    await expandScheduledMovements();
    const upcomingGroup = screen.getByLabelText(/Scheduled group/i);
    expect(within(upcomingGroup).getByText(/one[-_ ]shot/i)).toBeInTheDocument();
  });
});
