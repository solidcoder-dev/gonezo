import { Capacitor } from '@capacitor/core';
import type {
  CorePort,
  LedgerOpenAccountInput,
  LedgerOpenAccountResult,
  LedgerListSupportedCurrenciesResult,
  LedgerRenameAccountInput,
  LedgerArchiveAccountInput,
  LedgerDeleteAccountInput,
  LedgerListAccountsResult,
  LedgerGetAccountSummaryInput,
  LedgerGetAccountSummaryResult,
  LedgerRecordExpenseInput,
  LedgerRecordExpenseResult,
  LedgerRecordIncomeInput,
  LedgerRecordIncomeResult,
  LedgerRecordTransferInput,
  LedgerRecordTransferResult,
  LedgerRecordTransferFxInput,
  LedgerRecordTransferFxResult,
  LedgerCreateExpenseDraftInput,
  LedgerCreateExpenseDraftResult,
  LedgerAddTransactionItemInput,
  LedgerPostDraftTransactionInput,
  LedgerVoidTransactionInput,
  LedgerListTransactionsInput,
  LedgerListTransactionsResult,
  LedgerTransactionListItem,
  TaxonomyListCategoriesInput,
  TaxonomyListCategoriesResult,
  TaxonomyCreateCategoryInput,
  TaxonomyCreateCategoryResult,
  TaxonomyListTagsInput,
  TaxonomyListTagsResult,
  MobillsImportInput,
  MobillsImportResult,
  OrchestrationCategorizeTransactionInput,
  OrchestrationCategorizeTransactionResult,
  OrchestrationApplyTransactionTagsInput,
  OrchestrationApplyTransactionTagsResult,
  OrchestrationListTransactionTaxonomyInput,
  OrchestrationListTransactionTaxonomyResult,
  MovementsBackupExportResult,
  RecurrenceCreateRecurringMovementInput,
  RecurrenceCreateRecurringMovementResult,
  RecurrenceDeactivateRecurringMovementInput,
  RecurrenceListRecurringMovementsInput,
  RecurrenceListRecurringMovementsResult,
  SchedulingCreateMovementInput,
  SchedulingCreateMovementResult,
  SchedulingDeactivateMovementInput,
  SchedulingListMovementsInput,
  SchedulingListMovementsResult,
  SchedulingUpdateMovementInput,
  SchedulingUpdateMovementResult,
  SchedulingMovementItem,
  ExpectedCreateMovementInput,
  ExpectedCreateMovementResult,
  ExpectedUpdateMovementInput,
  ExpectedUpdateMovementResult,
  ExpectedDismissMovementInput,
  ExpectedListMovementsInput,
  ExpectedListMovementsResult,
  ExpectedMovementItem,
  ExpectedResolveMovementInput,
  MovementsMonthOverviewInput,
  MovementsMonthOverviewResult,
  MovementsGetOverviewInput,
  MovementsGetOverviewResult,
  MovementsSearchInput,
  MovementsSearchItem,
  MovementsSearchResult,
  MovementsListScheduledInput,
  MovementsListScheduledResult,
} from '../../domain/corePort';
import { resolveSchedulingKind } from '../../domain/schedulingKind';
import { CoreAdapterWeb } from './coreAdapterWeb';
import { CorePlugin } from './corePlugin';

type ScheduledMovementFilters = MovementsSearchInput['filters'] | MovementsListScheduledInput['filters'];

function scheduledMovementDateEpoch(movement: SchedulingMovementItem): number | undefined {
  const candidate = movement.nextDueAt ?? movement.startAt;
  const parsed = candidate ? Date.parse(candidate) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function filterScheduledMovementItems(
  items: SchedulingMovementItem[],
  filters?: ScheduledMovementFilters,
): SchedulingMovementItem[] {
  const resolvedFilters = filters ?? {};
  const text = resolvedFilters.text?.trim().toLowerCase();
  const merchant = resolvedFilters.merchant?.trim().toLowerCase();
  const categoryIds = resolvedFilters.categoryIds && resolvedFilters.categoryIds.length > 0
    ? resolvedFilters.categoryIds
    : resolvedFilters.categoryId
      ? [resolvedFilters.categoryId]
      : [];
  const categoryFilter = categoryIds.length > 0
    ? new Set(categoryIds.map((value) => value.trim()).filter((value) => value.length > 0))
    : null;
  const tagFilter = resolvedFilters.tagIds && resolvedFilters.tagIds.length > 0
    ? new Set(resolvedFilters.tagIds.map((value) => value.trim()).filter((value) => value.length > 0))
    : null;
  const typeFilter = resolvedFilters.types && resolvedFilters.types.length > 0
    ? new Set(resolvedFilters.types.filter((value) => value === 'expense' || value === 'income' || value === 'transfer'))
    : null;
  const parsedAmountMin = resolvedFilters.amountMin == null ? undefined : Number(resolvedFilters.amountMin);
  const parsedAmountMax = resolvedFilters.amountMax == null ? undefined : Number(resolvedFilters.amountMax);
  const hasAmountMin = typeof parsedAmountMin === 'number' && Number.isFinite(parsedAmountMin);
  const hasAmountMax = typeof parsedAmountMax === 'number' && Number.isFinite(parsedAmountMax);
  const fromDateEpoch = resolvedFilters.fromDate ? Date.parse(resolvedFilters.fromDate) : undefined;
  const toDateEpoch = resolvedFilters.toDate ? Date.parse(resolvedFilters.toDate) : undefined;
  const hasFromDateEpoch = typeof fromDateEpoch === 'number' && Number.isFinite(fromDateEpoch);
  const hasToDateEpoch = typeof toDateEpoch === 'number' && Number.isFinite(toDateEpoch);

  return items
    .filter((item) => (typeFilter ? typeFilter.has(item.type) : true))
    .filter((item) => (categoryFilter ? Boolean(item.categoryId && categoryFilter.has(item.categoryId)) : true))
    .filter((item) => {
      if (!tagFilter) {
        return true;
      }
      return (item.tagIds ?? []).some((tagId) => tagFilter.has(tagId));
    })
    .filter((item) => {
      if (!hasAmountMin && !hasAmountMax) {
        return true;
      }
      const amount = Number(item.amount);
      if (!Number.isFinite(amount)) {
        return false;
      }
      if (hasAmountMin && amount < parsedAmountMin!) {
        return false;
      }
      if (hasAmountMax && amount > parsedAmountMax!) {
        return false;
      }
      return true;
    })
    .filter((item) => {
      if (!hasFromDateEpoch && !hasToDateEpoch) {
        return true;
      }
      const dueEpoch = scheduledMovementDateEpoch(item);
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
    })
    .filter((item) => {
      if (!merchant) {
        return true;
      }
      return (item.merchant ?? '').toLowerCase().includes(merchant);
    })
    .filter((item) => {
      if (!text) {
        return true;
      }
      const merchantText = item.merchant?.toLowerCase() ?? '';
      const descriptionText = item.description?.toLowerCase() ?? '';
      return merchantText.includes(text) || descriptionText.includes(text);
    });
}

function mapPostedTransactionToSearchItem(transaction: LedgerTransactionListItem): MovementsSearchItem {
  return {
    id: transaction.id,
    source: 'posted',
    type: transaction.type,
    status: transaction.status === 'voided' ? 'voided' : 'posted',
    amount: transaction.amount,
    currency: transaction.currency,
    occurredAt: transaction.occurredAt,
    title: transaction.merchant || transaction.description || 'Movement',
    description: transaction.description,
    merchant: transaction.merchant,
    categoryId: transaction.categoryId,
    category: transaction.category,
    tags: transaction.tags,
    items: transaction.items,
  };
}

function mapScheduledMovementToSearchItem(movement: SchedulingMovementItem): MovementsSearchItem {
  const tags = (movement.tagNames ?? movement.tagIds ?? [])
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .map((tag) => ({ id: tag, name: tag }));

  return {
    id: movement.id,
    source: 'scheduled',
    type: movement.type,
    status: movement.status === 'active' ? 'scheduled' : movement.status === 'deactivated' ? 'deactivated' : 'failed',
    amount: movement.amount,
    currency: movement.currency,
    occurredAt: movement.nextDueAt ?? movement.startAt,
    title: movement.merchant || movement.description || 'Scheduled movement',
    description: movement.description,
    merchant: movement.merchant,
    category: movement.categoryId ? { id: movement.categoryId, name: movement.categoryId } : undefined,
    tags,
    items: movement.splitItems,
  };
}

function expectedMovementDateEpoch(movement: ExpectedMovementItem): number | undefined {
  const parsed = movement.expectedAt ? Date.parse(movement.expectedAt) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function filterExpectedMovementItems(
  items: ExpectedMovementItem[],
  filters?: MovementsSearchInput['filters'],
): ExpectedMovementItem[] {
  const resolvedFilters = filters ?? {};
  const text = resolvedFilters.text?.trim().toLowerCase();
  const merchant = resolvedFilters.merchant?.trim().toLowerCase();
  const categoryIds = resolvedFilters.categoryIds && resolvedFilters.categoryIds.length > 0
    ? resolvedFilters.categoryIds
    : resolvedFilters.categoryId
      ? [resolvedFilters.categoryId]
      : [];
  const categoryFilter = categoryIds.length > 0
    ? new Set(categoryIds.map((value) => value.trim()).filter((value) => value.length > 0))
    : null;
  const hasTagFilter = Boolean(resolvedFilters.tagIds && resolvedFilters.tagIds.length > 0);
  const typeFilter = resolvedFilters.types && resolvedFilters.types.length > 0
    ? new Set(resolvedFilters.types.filter((value) => value === 'expense' || value === 'income'))
    : null;
  const parsedAmountMin = resolvedFilters.amountMin == null ? undefined : Number(resolvedFilters.amountMin);
  const parsedAmountMax = resolvedFilters.amountMax == null ? undefined : Number(resolvedFilters.amountMax);
  const hasAmountMin = typeof parsedAmountMin === 'number' && Number.isFinite(parsedAmountMin);
  const hasAmountMax = typeof parsedAmountMax === 'number' && Number.isFinite(parsedAmountMax);
  const fromDateEpoch = resolvedFilters.fromDate ? Date.parse(resolvedFilters.fromDate) : undefined;
  const toDateEpoch = resolvedFilters.toDate ? Date.parse(resolvedFilters.toDate) : undefined;
  const hasFromDateEpoch = typeof fromDateEpoch === 'number' && Number.isFinite(fromDateEpoch);
  const hasToDateEpoch = typeof toDateEpoch === 'number' && Number.isFinite(toDateEpoch);

  return items
    .filter((item) => (typeFilter ? typeFilter.has(item.type) : true))
    .filter((item) => (categoryFilter ? Boolean(item.categoryId && categoryFilter.has(item.categoryId)) : true))
    .filter(() => !hasTagFilter)
    .filter((item) => {
      if (!hasAmountMin && !hasAmountMax) {
        return true;
      }
      const amount = Number(item.amount);
      if (!Number.isFinite(amount)) {
        return false;
      }
      if (hasAmountMin && amount < parsedAmountMin!) {
        return false;
      }
      if (hasAmountMax && amount > parsedAmountMax!) {
        return false;
      }
      return true;
    })
    .filter((item) => {
      if (!hasFromDateEpoch && !hasToDateEpoch) {
        return true;
      }
      const expectedEpoch = expectedMovementDateEpoch(item);
      if (expectedEpoch == null) {
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
    .filter((item) => {
      if (!merchant) {
        return true;
      }
      return (item.merchant ?? '').toLowerCase().includes(merchant);
    })
    .filter((item) => {
      if (!text) {
        return true;
      }
      const merchantText = item.merchant?.toLowerCase() ?? '';
      const descriptionText = item.description?.toLowerCase() ?? '';
      return merchantText.includes(text) || descriptionText.includes(text);
    });
}

function sortExpectedMovementItems(
  items: ExpectedMovementItem[],
  sort?: MovementsSearchInput['sort'],
): ExpectedMovementItem[] {
  const resolvedSort = sort && sort.length > 0 ? sort : [{ field: 'date' as const, direction: 'desc' as const }];
  const [primary] = resolvedSort;
  const direction = primary.direction === 'asc' ? 1 : -1;
  return [...items].sort((left, right) => {
    const comparison = primary.field === 'amount'
      ? Number(left.amount) - Number(right.amount)
      : (expectedMovementDateEpoch(left) ?? 0) - (expectedMovementDateEpoch(right) ?? 0);
    if (comparison !== 0) {
      return comparison * direction;
    }
    return left.id.localeCompare(right.id);
  });
}

function mapExpectedMovementToSearchItem(
  movement: ExpectedMovementItem,
  categoryNamesById?: Map<string, string>,
): MovementsSearchItem {
  return {
    id: movement.id,
    source: 'expected',
    type: movement.type,
    status: movement.status === 'pending' ? 'expected' : movement.status,
    amount: movement.amount,
    currency: movement.currency,
    occurredAt: movement.expectedAt,
    title: movement.merchant || movement.description || 'Expected movement',
    description: movement.description,
    merchant: movement.merchant,
    categoryId: movement.categoryId,
    category: movement.categoryId
      ? { id: movement.categoryId, name: categoryNamesById?.get(movement.categoryId) ?? movement.categoryId }
      : undefined,
    tags: [],
    items: movement.splitItems,
  };
}

export class CoreAdapter implements CorePort {
  private readonly web = new CoreAdapterWeb();

  async ledgerOpenAccount(input: LedgerOpenAccountInput): Promise<LedgerOpenAccountResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.ledgerOpenAccount(input);
    }
    return this.web.ledgerOpenAccount(input);
  }

  async ledgerListSupportedCurrencies(): Promise<LedgerListSupportedCurrenciesResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.ledgerListSupportedCurrencies();
    }
    return this.web.ledgerListSupportedCurrencies();
  }

  async ledgerRenameAccount(input: LedgerRenameAccountInput): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await CorePlugin.ledgerRenameAccount(input);
      return;
    }
    await this.web.ledgerRenameAccount(input);
  }

  async ledgerArchiveAccount(input: LedgerArchiveAccountInput): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await CorePlugin.ledgerArchiveAccount(input);
      return;
    }
    await this.web.ledgerArchiveAccount(input);
  }

  async ledgerDeleteAccount(input: LedgerDeleteAccountInput): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await CorePlugin.ledgerDeleteAccount(input);
      return;
    }
    await this.web.ledgerDeleteAccount(input);
  }

  async ledgerListAccounts(): Promise<LedgerListAccountsResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.ledgerListAccounts();
    }
    return this.web.ledgerListAccounts();
  }

  async ledgerGetAccountSummary(input: LedgerGetAccountSummaryInput): Promise<LedgerGetAccountSummaryResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.ledgerGetAccountSummary(input);
    }
    return this.web.ledgerGetAccountSummary(input);
  }

  async ledgerRecordExpense(input: LedgerRecordExpenseInput): Promise<LedgerRecordExpenseResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.ledgerRecordExpense(input);
    }
    return this.web.ledgerRecordExpense(input);
  }

  async ledgerRecordIncome(input: LedgerRecordIncomeInput): Promise<LedgerRecordIncomeResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.ledgerRecordIncome(input);
    }
    return this.web.ledgerRecordIncome(input);
  }

  async ledgerRecordTransfer(input: LedgerRecordTransferInput): Promise<LedgerRecordTransferResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.ledgerRecordTransfer(input);
    }
    return this.web.ledgerRecordTransfer(input);
  }

  async ledgerRecordTransferFx(input: LedgerRecordTransferFxInput): Promise<LedgerRecordTransferFxResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.ledgerRecordTransferFx(input);
    }
    return this.web.ledgerRecordTransferFx(input);
  }

  async ledgerCreateExpenseDraft(input: LedgerCreateExpenseDraftInput): Promise<LedgerCreateExpenseDraftResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.ledgerCreateExpenseDraft(input);
    }
    return this.web.ledgerCreateExpenseDraft(input);
  }

  async ledgerAddTransactionItem(input: LedgerAddTransactionItemInput): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await CorePlugin.ledgerAddTransactionItem(input);
      return;
    }
    await this.web.ledgerAddTransactionItem(input);
  }

  async ledgerPostDraftTransaction(input: LedgerPostDraftTransactionInput): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await CorePlugin.ledgerPostDraftTransaction(input);
      return;
    }
    await this.web.ledgerPostDraftTransaction(input);
  }

  async ledgerVoidTransaction(input: LedgerVoidTransactionInput): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await CorePlugin.ledgerVoidTransaction(input);
      return;
    }
    await this.web.ledgerVoidTransaction(input);
  }

  async ledgerListTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.ledgerListTransactions(input);
    }
    return this.web.ledgerListTransactions(input);
  }

  async taxonomyListCategories(input?: TaxonomyListCategoriesInput): Promise<TaxonomyListCategoriesResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.taxonomyListCategories(input ?? {});
    }
    return this.web.taxonomyListCategories(input);
  }

  async taxonomyCreateCategory(input: TaxonomyCreateCategoryInput): Promise<TaxonomyCreateCategoryResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.taxonomyCreateCategory(input);
    }
    return this.web.taxonomyCreateCategory(input);
  }

  async taxonomyListTags(input?: TaxonomyListTagsInput): Promise<TaxonomyListTagsResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.taxonomyListTags(input ?? {});
    }
    return this.web.taxonomyListTags(input);
  }

  async mobillsImport(input: MobillsImportInput): Promise<MobillsImportResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.mobillsImport(input);
    }
    return this.web.mobillsImport(input);
  }

  async orchestrationCategorizeTransaction(
    input: OrchestrationCategorizeTransactionInput,
  ): Promise<OrchestrationCategorizeTransactionResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.orchestrationCategorizeTransaction(input);
    }
    return this.web.orchestrationCategorizeTransaction(input);
  }

  async orchestrationApplyTransactionTags(
    input: OrchestrationApplyTransactionTagsInput,
  ): Promise<OrchestrationApplyTransactionTagsResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.orchestrationApplyTransactionTags(input);
    }
    return this.web.orchestrationApplyTransactionTags(input);
  }

  async orchestrationListTransactionTaxonomy(
    input: OrchestrationListTransactionTaxonomyInput,
  ): Promise<OrchestrationListTransactionTaxonomyResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.orchestrationListTransactionTaxonomy(input);
    }
    return this.web.orchestrationListTransactionTaxonomy(input);
  }

  async movementsExportBackup(): Promise<MovementsBackupExportResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.movementsExportBackup();
    }
    return this.web.movementsExportBackup();
  }

  async recurrenceCreateRecurringMovement(
    input: RecurrenceCreateRecurringMovementInput,
  ): Promise<RecurrenceCreateRecurringMovementResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.recurrenceCreateRecurringMovement(input);
    }
    return this.web.recurrenceCreateRecurringMovement(input);
  }

  async recurrenceDeactivateRecurringMovement(input: RecurrenceDeactivateRecurringMovementInput): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await CorePlugin.recurrenceDeactivateRecurringMovement(input);
      return;
    }
    await this.web.recurrenceDeactivateRecurringMovement(input);
  }

  async recurrenceListRecurringMovements(
    input: RecurrenceListRecurringMovementsInput,
  ): Promise<RecurrenceListRecurringMovementsResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.recurrenceListRecurringMovements(input);
    }
    return this.web.recurrenceListRecurringMovements(input);
  }

  async schedulingCreateMovement(
    input: SchedulingCreateMovementInput,
  ): Promise<SchedulingCreateMovementResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.recurrenceCreateRecurringMovement(input);
    }
    return this.web.schedulingCreateMovement(input);
  }

  async schedulingUpdateMovement(
    input: SchedulingUpdateMovementInput,
  ): Promise<SchedulingUpdateMovementResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.recurrenceUpdateRecurringMovement(input);
    }
    return this.web.schedulingUpdateMovement(input);
  }

  async schedulingDeactivateMovement(input: SchedulingDeactivateMovementInput): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await CorePlugin.recurrenceDeactivateRecurringMovement(input);
      return;
    }
    await this.web.schedulingDeactivateMovement(input);
  }

  async schedulingListMovements(input: SchedulingListMovementsInput): Promise<SchedulingListMovementsResult> {
    if (Capacitor.isNativePlatform()) {
      const result = await CorePlugin.recurrenceListRecurringMovements(input);
      return {
        items: result.items.map((item) => {
          const kind = resolveSchedulingKind(item);
          return {
            ...item,
            scheduleKind: kind,
            origin: kind,
          };
        }),
      };
    }
    return this.web.schedulingListMovements(input);
  }

  async expectedCreateMovement(input: ExpectedCreateMovementInput): Promise<ExpectedCreateMovementResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.expectedCreateMovement(input);
    }
    return this.web.expectedCreateMovement(input);
  }

  async expectedUpdateMovement(input: ExpectedUpdateMovementInput): Promise<ExpectedUpdateMovementResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.expectedUpdateMovement(input);
    }
    return this.web.expectedUpdateMovement(input);
  }

  async expectedListMovements(input: ExpectedListMovementsInput): Promise<ExpectedListMovementsResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.expectedListMovements(input);
    }
    return this.web.expectedListMovements(input);
  }

  async expectedResolveMovement(input: ExpectedResolveMovementInput): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await CorePlugin.expectedResolveMovement(input);
      return;
    }
    await this.web.expectedResolveMovement(input);
  }

  async expectedDismissMovement(input: ExpectedDismissMovementInput): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await CorePlugin.expectedDismissMovement(input);
      return;
    }
    await this.web.expectedDismissMovement(input);
  }

  async movementsGetMonthOverview(input: MovementsMonthOverviewInput): Promise<MovementsMonthOverviewResult> {
    if (!Capacitor.isNativePlatform()) {
      return this.web.movementsGetMonthOverview(input);
    }

    const fromDate = input.fromDate ?? input.filters?.fromDate;
    const toDate = input.toDate ?? input.filters?.toDate;
    const expectedPreviewSize = input.expectedPreviewSize != null && input.expectedPreviewSize > 0
      ? Math.min(Math.trunc(input.expectedPreviewSize), 20)
      : 5;
    const scheduledItems: SchedulingMovementItem[] = [];
    let scheduledPageIndex = 0;
    let hasMoreScheduled = true;
    while (hasMoreScheduled) {
      const pageResult = await this.movementsListScheduled({
        accountId: input.accountId,
        filters: {
          fromDate,
          toDate,
        },
        pagination: {
          page: scheduledPageIndex,
          size: 100,
        },
      });
      scheduledItems.push(...pageResult.content);
      hasMoreScheduled = pageResult.hasNext;
      scheduledPageIndex += 1;
      if (!hasMoreScheduled || pageResult.content.length === 0) {
        break;
      }
    }
    const expectedResult = await this.expectedListMovements({
      accountId: input.accountId,
    });
    const expectedFiltered = sortExpectedMovementItems(
      filterExpectedMovementItems(expectedResult.items, {
        fromDate,
        toDate,
      }),
      [{ field: 'date', direction: 'asc' }],
    );

    const postedPage = await CorePlugin.ledgerListTransactions({
      accountId: input.accountId,
      filters: {
        fromDate,
        toDate,
        statuses: ['posted'],
      },
      pagination: input.postedPagination ?? input.executedPagination,
      sort: input.sort ?? [{ field: 'occurredAt', direction: 'desc' }],
    });

    return {
      scheduledPreview: {
        items: scheduledItems,
        total: scheduledItems.length,
        hasMore: false,
      },
      expectedPreview: {
        items: expectedFiltered.slice(0, expectedPreviewSize),
        total: expectedFiltered.length,
        hasMore: expectedFiltered.length > expectedPreviewSize,
      },
      postedPage,
      executedPage: postedPage,
    };
  }

  async movementsSearch(input: MovementsSearchInput): Promise<MovementsSearchResult> {
    if (!Capacitor.isNativePlatform()) {
      return this.web.movementsSearch(input);
    }

    const requestedSize = input.pagination?.size ?? 20;
    const pageSize = Number.isFinite(requestedSize) && requestedSize > 0 ? Math.min(Math.trunc(requestedSize), 100) : 20;
    const requestedPage = input.pagination?.page ?? 0;
    const page = Number.isFinite(requestedPage) && requestedPage >= 0 ? Math.trunc(requestedPage) : 0;
    const filters = input.filters ?? {};

    if (input.source === 'posted') {
      const result = await CorePlugin.ledgerListTransactions({
        accountId: input.accountId,
        filters: {
          text: filters.text,
          merchant: filters.merchant,
          categoryId: filters.categoryId,
          categoryIds: filters.categoryIds,
          tagIds: filters.tagIds,
          amountMin: filters.amountMin,
          amountMax: filters.amountMax,
          fromDate: filters.fromDate,
          toDate: filters.toDate,
          types: filters.types,
          statuses: ['posted'],
        },
        pagination: {
          page,
          size: pageSize,
        },
        sort: input.sort?.map((item) => ({
          field: item.field === 'date' ? 'occurredAt' : item.field,
          direction: item.direction,
        })) ?? [{ field: 'occurredAt', direction: 'desc' }],
      });

      return {
        content: result.content.map((transaction) => mapPostedTransactionToSearchItem(transaction)),
        page: result.page,
        size: result.size,
        totalElements: result.totalElements,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrevious: result.hasPrevious,
      };
    }

    if (input.source === 'expected') {
      const [result, categories] = await Promise.all([
        this.expectedListMovements({
          accountId: input.accountId,
          includeClosed: filters.status === 'all',
        }),
        this.taxonomyListCategories({}),
      ]);
      const categoryNamesById = new Map(categories.items.map((category) => [category.id, category.name]));
      const filtered = filterExpectedMovementItems(result.items, filters);
      const sorted = sortExpectedMovementItems(filtered, input.sort);
      const totalElements = sorted.length;
      const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / pageSize);
      const resolvedPage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);
      const start = resolvedPage * pageSize;
      const content = sorted
        .slice(start, start + pageSize)
        .map((movement) => mapExpectedMovementToSearchItem(movement, categoryNamesById));

      return {
        content,
        page: resolvedPage,
        size: pageSize,
        totalElements,
        totalPages,
        hasNext: totalPages > 0 && resolvedPage + 1 < totalPages,
        hasPrevious: resolvedPage > 0,
      };
    }

    const scheduledResult = await this.movementsListScheduled({
      accountId: input.accountId,
      filters,
      pagination: {
        page,
        size: pageSize,
      },
      sort: input.sort?.map((item) => ({
        field: item.field === 'date' ? 'nextDueAt' : item.field,
        direction: item.direction,
      })) ?? [{ field: 'nextDueAt', direction: 'desc' }],
    });

    return {
      content: scheduledResult.content.map((movement) => mapScheduledMovementToSearchItem(movement)),
      page: scheduledResult.page,
      size: scheduledResult.size,
      totalElements: scheduledResult.totalElements,
      totalPages: scheduledResult.totalPages,
      hasNext: scheduledResult.hasNext,
      hasPrevious: scheduledResult.hasPrevious,
    };
  }

  async movementsGetOverview(input: MovementsGetOverviewInput): Promise<MovementsGetOverviewResult> {
    return this.movementsGetMonthOverview(input);
  }

  async movementsListScheduled(input: MovementsListScheduledInput): Promise<MovementsListScheduledResult> {
    if (!Capacitor.isNativePlatform()) {
      return this.web.movementsListScheduled(input);
    }
    const result = await this.schedulingListMovements({ sourceAccountId: input.accountId });
    const requestedPage = input.pagination?.page ?? 0;
    const requestedSize = input.pagination?.size ?? 20;
    const page = Number.isFinite(requestedPage) && requestedPage >= 0 ? Math.trunc(requestedPage) : 0;
    const size = Number.isFinite(requestedSize) && requestedSize > 0 ? Math.min(Math.trunc(requestedSize), 100) : 20;

    const filtered = filterScheduledMovementItems(result.items, input.filters);

    const totalElements = filtered.length;
    const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);
    const resolvedPage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);
    const start = resolvedPage * size;
    const content = filtered.slice(start, start + size);

    return {
      content,
      page: resolvedPage,
      size,
      totalElements,
      totalPages,
      hasNext: totalPages > 0 && resolvedPage + 1 < totalPages,
      hasPrevious: resolvedPage > 0,
    };
  }
}
