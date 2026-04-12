import { Capacitor } from '@capacitor/core';
import type {
  CorePort,
  CoreResult,
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
  TransactionVoiceExtractDraftInput,
  TransactionVoiceExtractDraftResult,
  TransactionVoiceFinalizeInput,
  TransactionVoiceFinalizeResult,
  TransactionVoiceStartInput,
  TransactionVoiceStartResult,
  TransactionVoiceStopInput,
  TransactionVoiceStopResult,
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
  MovementsGetOverviewInput,
  MovementsGetOverviewResult,
  MovementsListScheduledInput,
  MovementsListScheduledResult,
} from '../../domain/corePort';
import { resolveSchedulingKind } from '../../domain/schedulingKind';
import { CoreAdapterWeb } from './coreAdapterWeb';
import { CorePlugin } from './corePlugin';

export class CoreAdapter implements CorePort {
  private readonly web = new CoreAdapterWeb();

  async doThing(input: string): Promise<CoreResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.doThing({ input });
    }
    return this.web.doThing(input);
  }

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

  async transactionVoiceStart(input: TransactionVoiceStartInput): Promise<TransactionVoiceStartResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.transactionVoiceStart(input);
    }
    return this.web.transactionVoiceStart(input);
  }

  async transactionVoiceStop(input: TransactionVoiceStopInput): Promise<TransactionVoiceStopResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.transactionVoiceStop(input);
    }
    return this.web.transactionVoiceStop(input);
  }

  async transactionVoiceExtractDraft(input: TransactionVoiceExtractDraftInput): Promise<TransactionVoiceExtractDraftResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.transactionVoiceExtractDraft(input);
    }
    return this.web.transactionVoiceExtractDraft(input);
  }

  async transactionVoiceFinalize(input: TransactionVoiceFinalizeInput): Promise<TransactionVoiceFinalizeResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.transactionVoiceFinalize(input);
    }
    return this.web.transactionVoiceFinalize(input);
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

  async movementsGetOverview(input: MovementsGetOverviewInput): Promise<MovementsGetOverviewResult> {
    if (!Capacitor.isNativePlatform()) {
      return this.web.movementsGetOverview(input);
    }
    const previewSize = input.scheduledPreviewSize != null && input.scheduledPreviewSize > 0
      ? Math.min(Math.trunc(input.scheduledPreviewSize), 20)
      : 5;
    const status = input.filters?.status ?? 'all';
    const origin = input.filters?.origin ?? 'all';

    const scheduledResult = await this.schedulingListMovements({ sourceAccountId: input.accountId });
    const scheduledFiltered = scheduledResult.items
      .filter((item) => {
        if (status === 'scheduled') {
          return item.status === 'active';
        }
        if (status === 'all') {
          return true;
        }
        return false;
      })
      .filter((item) => {
        const resolvedOrigin = resolveSchedulingKind(item);
        if (origin === 'all') {
          return true;
        }
        if (origin === 'manual') {
          return false;
        }
        return resolvedOrigin === origin;
      });

    const shouldHideExecuted = status === 'scheduled' || status === 'failed' || origin === 'recurring' || origin === 'one_shot';
    const executedPage = shouldHideExecuted
      ? {
          content: [],
          page: 0,
          size: input.executedPagination?.size ?? 20,
          totalElements: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        }
      : await this.ledgerListTransactions({
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
            types: input.filters?.types,
            statuses: status === 'executed'
              ? ['posted']
              : status === 'voided'
                ? ['voided']
                : undefined,
          },
          pagination: input.executedPagination,
          sort: input.sort,
        });

    return {
      scheduledPreview: {
        items: scheduledFiltered.slice(0, previewSize),
        total: scheduledFiltered.length,
        hasMore: scheduledFiltered.length > previewSize,
      },
      executedPage,
    };
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

    const filtered = result.items.filter((item) => {
      if ((input.filters?.status ?? 'all') === 'scheduled') {
        return item.status === 'active';
      }
      if ((input.filters?.status ?? 'all') === 'all') {
        return true;
      }
      return false;
    }).filter((item) => {
      const origin = input.filters?.origin ?? 'all';
      const resolvedOrigin = resolveSchedulingKind(item);
      if (origin === 'all') {
        return true;
      }
      if (origin === 'manual') {
        return false;
      }
      return resolvedOrigin === origin;
    });

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
