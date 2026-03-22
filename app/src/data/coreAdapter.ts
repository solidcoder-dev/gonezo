import { Capacitor } from '@capacitor/core';
import type {
  CorePort,
  CoreResult,
  LedgerOpenAccountInput,
  LedgerOpenAccountResult,
  LedgerListSupportedCurrenciesResult,
  LedgerRenameAccountInput,
  LedgerArchiveAccountInput,
  LedgerListAccountsResult,
  LedgerGetAccountSummaryInput,
  LedgerGetAccountSummaryResult,
  LedgerRecordExpenseInput,
  LedgerRecordExpenseResult,
  LedgerRecordIncomeInput,
  LedgerRecordIncomeResult,
  LedgerRecordTransferInput,
  LedgerRecordTransferResult,
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
  OrchestrationCategorizeTransactionInput,
  OrchestrationCategorizeTransactionResult,
} from '../domain/corePort';
import { CoreAdapterWeb } from './coreAdapterWeb';
import { CorePlugin } from '../native/corePlugin';

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

  async orchestrationCategorizeTransaction(
    input: OrchestrationCategorizeTransactionInput,
  ): Promise<OrchestrationCategorizeTransactionResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.orchestrationCategorizeTransaction(input);
    }
    return this.web.orchestrationCategorizeTransaction(input);
  }
}
