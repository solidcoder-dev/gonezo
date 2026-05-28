import { Capacitor } from '@capacitor/core';
import type { CorePort } from '../application/corePort';
import type {
  UserPreferencesResult,
  PreferencesSetDefaultAccountInput,
} from '../../account/application/preferencesCore.port';
import type {
  LedgerOpenAccountInput,
  LedgerOpenAccountResult,
  LedgerListSupportedCurrenciesResult,
  LedgerRenameAccountInput,
  LedgerArchiveAccountInput,
  LedgerRestoreAccountInput,
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
} from '../../ledger/application/ledgerCore.port';
import type {
  TaxonomyListCategoriesInput,
  TaxonomyListCategoriesResult,
  TaxonomyCreateCategoryInput,
  TaxonomyCreateCategoryResult,
  TaxonomyRenameCategoryInput,
  TaxonomyListTagsInput,
  TaxonomyListTagsResult,
  TaxonomyRenameTagInput,
  OrchestrationCategorizeTransactionInput,
  OrchestrationCategorizeTransactionResult,
  OrchestrationApplyTransactionTagsInput,
  OrchestrationApplyTransactionTagsResult,
  OrchestrationListTransactionTaxonomyInput,
  OrchestrationListTransactionTaxonomyResult,
} from '../../taxonomy/application/taxonomyCore.port';
import type {
  MobillsImportInput,
  MobillsImportResult,
  MovementsBackupExportResult,
  MovementsBackupImportInput,
  MovementsBackupImportResult,
} from '../../imports/application/importsCore.port';
import type {
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
} from '../../scheduling/application/schedulingCore.port';
import type {
  ExpectedCreateMovementInput,
  ExpectedCreateMovementResult,
  ExpectedUpdateMovementInput,
  ExpectedUpdateMovementResult,
  ExpectedDismissMovementInput,
  ExpectedListMovementsInput,
  ExpectedListMovementsResult,
  ExpectedResolveMovementInput,
} from '../../expected/application/expectedCore.port';
import type {
  MovementsMonthOverviewInput,
  MovementsMonthOverviewResult,
  MovementsGetOverviewInput,
  MovementsGetOverviewResult,
  MovementsSearchFacetsInput,
  MovementsSearchFacetsResult,
  MovementsSearchInput,
  MovementsSearchResult,
  MovementsListScheduledInput,
  MovementsListScheduledResult,
} from '../../movements/application/movementsCore.port';
import { resolveSchedulingKind } from '../../shared/domain/schedulingKind';
import { CoreAdapterWeb } from './coreAdapterWeb';
import { CorePlugin } from './corePlugin';
import {
  getNativeMovementsMonthOverview,
  listNativeScheduledMovements,
  searchNativeMovements,
} from './coreAdapterNativeMovements';
import { getMovementsSearchFacets } from './movementsSearchFacets';

export class CoreAdapter implements CorePort {
  private readonly web = new CoreAdapterWeb();

  async preferencesGet(): Promise<UserPreferencesResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.preferencesGet();
    }
    return this.web.preferencesGet();
  }

  async preferencesSetDefaultAccount(input: PreferencesSetDefaultAccountInput): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await CorePlugin.preferencesSetDefaultAccount(input);
      return;
    }
    await this.web.preferencesSetDefaultAccount(input);
  }

  async preferencesClearDefaultAccount(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await CorePlugin.preferencesClearDefaultAccount();
      return;
    }
    await this.web.preferencesClearDefaultAccount();
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

  async ledgerRestoreAccount(input: LedgerRestoreAccountInput): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await CorePlugin.ledgerRestoreAccount(input);
      return;
    }
    await this.web.ledgerRestoreAccount(input);
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

  async taxonomyRenameCategory(input: TaxonomyRenameCategoryInput): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await CorePlugin.taxonomyRenameCategory(input);
      return;
    }
    await this.web.taxonomyRenameCategory(input);
  }

  async taxonomyListTags(input?: TaxonomyListTagsInput): Promise<TaxonomyListTagsResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.taxonomyListTags(input ?? {});
    }
    return this.web.taxonomyListTags(input);
  }

  async taxonomyRenameTag(input: TaxonomyRenameTagInput): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await CorePlugin.taxonomyRenameTag(input);
      return;
    }
    await this.web.taxonomyRenameTag(input);
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

  async movementsImportBackup(input: MovementsBackupImportInput): Promise<MovementsBackupImportResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.movementsImportBackup(input);
    }
    return this.web.movementsImportBackup(input);
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

    return getNativeMovementsMonthOverview(this, input);
  }

  async movementsSearch(input: MovementsSearchInput): Promise<MovementsSearchResult> {
    if (!Capacitor.isNativePlatform()) {
      return this.web.movementsSearch(input);
    }

    return searchNativeMovements(this, input);
  }

  async movementsGetSearchFacets(input: MovementsSearchFacetsInput): Promise<MovementsSearchFacetsResult> {
    return getMovementsSearchFacets(this, input);
  }

  async movementsGetOverview(input: MovementsGetOverviewInput): Promise<MovementsGetOverviewResult> {
    return this.movementsGetMonthOverview(input);
  }

  async movementsListScheduled(input: MovementsListScheduledInput): Promise<MovementsListScheduledResult> {
    if (!Capacitor.isNativePlatform()) {
      return this.web.movementsListScheduled(input);
    }
    return listNativeScheduledMovements(this, input);
  }
}
