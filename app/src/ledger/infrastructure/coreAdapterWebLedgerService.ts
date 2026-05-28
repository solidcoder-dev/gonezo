import type {
  LedgerAddTransactionItemInput,
  LedgerArchiveAccountInput,
  LedgerCreateExpenseDraftInput,
  LedgerCreateExpenseDraftResult,
  LedgerDeleteAccountInput,
  LedgerGetAccountSummaryInput,
  LedgerGetAccountSummaryResult,
  LedgerListAccountsResult,
  LedgerListSupportedCurrenciesResult,
  LedgerListTransactionsInput,
  LedgerListTransactionsResult,
  LedgerOpenAccountInput,
  LedgerOpenAccountResult,
  LedgerPostDraftTransactionInput,
  LedgerRecordExpenseInput,
  LedgerRecordExpenseResult,
  LedgerRecordIncomeInput,
  LedgerRecordIncomeResult,
  LedgerRecordTransferFxInput,
  LedgerRecordTransferFxResult,
  LedgerRecordTransferInput,
  LedgerRecordTransferResult,
  LedgerRenameAccountInput,
  LedgerRestoreAccountInput,
  LedgerVoidTransactionInput,
} from '../application/ledgerCore.port';
import type { CoreAdapterWebDependencies } from '../../core/infrastructure/coreAdapterWebEffects';
import { WebLedgerAccountService } from './coreAdapterWebLedgerAccountService';
import {
  ensureWebAccountCanPost,
  getWebLedgerAccountOrThrow,
  getWebLedgerTransactionOrThrow,
} from './coreAdapterWebLedgerGuards';
import { WebLedgerTransactionService } from './coreAdapterWebLedgerTransactionService';
import { WebLedgerTransferService } from './coreAdapterWebLedgerTransferService';
import type {
  WebCoreState,
  WebLedgerAccount,
  WebLedgerTransaction,
} from '../../core/infrastructure/coreAdapterWebState';

export type WebLedgerServiceOptions = {
  state: WebCoreState;
  dependencies: CoreAdapterWebDependencies;
};

export class WebLedgerService {
  private readonly state: WebCoreState;

  private readonly accountService: WebLedgerAccountService;

  private readonly transactionService: WebLedgerTransactionService;

  private readonly transferService: WebLedgerTransferService;

  constructor(options: WebLedgerServiceOptions) {
    this.state = options.state;
    this.accountService = new WebLedgerAccountService(options);
    this.transactionService = new WebLedgerTransactionService(options);
    this.transferService = new WebLedgerTransferService(options);
  }

  getAccountOrThrow(accountId: string): WebLedgerAccount {
    return getWebLedgerAccountOrThrow(this.state, accountId);
  }

  getTransactionOrThrow(transactionId: string): WebLedgerTransaction {
    return getWebLedgerTransactionOrThrow(this.state, transactionId);
  }

  ensureAccountCanPost(account: WebLedgerAccount, currency: string) {
    ensureWebAccountCanPost(account, currency);
  }

  async resolveImportAccount(
    accountName: string,
    currency: string,
    createMissingAccounts: boolean,
  ): Promise<WebLedgerAccount> {
    return this.accountService.resolveImportAccount(accountName, currency, createMissingAccounts);
  }

  async openAccount(input: LedgerOpenAccountInput): Promise<LedgerOpenAccountResult> {
    return this.accountService.openAccount(input);
  }

  async listSupportedCurrencies(): Promise<LedgerListSupportedCurrenciesResult> {
    return this.accountService.listSupportedCurrencies();
  }

  async renameAccount(input: LedgerRenameAccountInput): Promise<void> {
    return this.accountService.renameAccount(input);
  }

  async archiveAccount(input: LedgerArchiveAccountInput): Promise<void> {
    return this.accountService.archiveAccount(input);
  }

  async restoreAccount(input: LedgerRestoreAccountInput): Promise<void> {
    return this.accountService.restoreAccount(input);
  }

  async deleteAccount(input: LedgerDeleteAccountInput): Promise<void> {
    return this.accountService.deleteAccount(input);
  }

  async listAccounts(): Promise<LedgerListAccountsResult> {
    return this.accountService.listAccounts();
  }

  async getAccountSummary(input: LedgerGetAccountSummaryInput): Promise<LedgerGetAccountSummaryResult> {
    return this.accountService.getAccountSummary(input);
  }

  async recordExpense(input: LedgerRecordExpenseInput): Promise<LedgerRecordExpenseResult> {
    return this.transactionService.recordExpense(input);
  }

  async recordIncome(input: LedgerRecordIncomeInput): Promise<LedgerRecordIncomeResult> {
    return this.transactionService.recordIncome(input);
  }

  async recordTransfer(input: LedgerRecordTransferInput): Promise<LedgerRecordTransferResult> {
    return this.transferService.recordTransfer(input);
  }

  async recordTransferFx(input: LedgerRecordTransferFxInput): Promise<LedgerRecordTransferFxResult> {
    return this.transferService.recordTransferFx(input);
  }

  async createExpenseDraft(input: LedgerCreateExpenseDraftInput): Promise<LedgerCreateExpenseDraftResult> {
    return this.transactionService.createExpenseDraft(input);
  }

  async addTransactionItem(input: LedgerAddTransactionItemInput): Promise<void> {
    return this.transactionService.addTransactionItem(input);
  }

  async postDraftTransaction(input: LedgerPostDraftTransactionInput): Promise<void> {
    return this.transactionService.postDraftTransaction(input);
  }

  async voidTransaction(input: LedgerVoidTransactionInput): Promise<void> {
    return this.transactionService.voidTransaction(input);
  }

  async listTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult> {
    return this.transactionService.listTransactions(input);
  }
}
