import type {
  LedgerAddTransactionItemInput,
  LedgerArchiveAccountInput,
  LedgerCreateExpenseDraftInput,
  LedgerCreateExpenseDraftResult,
  LedgerDeleteAccountInput,
  LedgerGetAccountSummaryInput,
  LedgerGetAccountSummaryResult,
  LedgerGetNetWorthByCurrencyResult,
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
} from '../application/ledger.port';
import type { WebRuntimeDependencies } from '../../core/infrastructure/webRuntimeDependencies';
import { WebLedgerAccountService } from './webLedgerAccountService';
import {
  ensureWebAccountCanPost,
  getWebLedgerAccountOrThrow,
  getWebLedgerTransactionOrThrow,
} from './webLedgerGuards';
import { WebLedgerTransactionService } from './webLedgerTransactionService';
import { WebLedgerTransferService } from './webLedgerTransferService';
import type {
  WebAppState,
  WebLedgerAccount,
  WebLedgerTransaction,
} from '../../core/infrastructure/webAppState';
import { sortNetWorthCurrencies } from '../application/netWorthOrdering';

export type WebLedgerServiceOptions = {
  state: WebAppState;
  dependencies: WebRuntimeDependencies;
};

function addLedgerAmount(left: string, right: string): string {
  return (Number(left) + Number(right)).toFixed(2);
}

export class WebLedgerService {
  private readonly state: WebAppState;

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

  async getNetWorthByCurrency(): Promise<LedgerGetNetWorthByCurrencyResult> {
    const accounts = await this.listAccounts();
    const balanceByCurrency = new Map<string, string>();

    for (const account of accounts.items) {
      const summary = await this.getAccountSummary({ accountId: account.id });
      const previous = balanceByCurrency.get(summary.currency) ?? '0.00';
      balanceByCurrency.set(summary.currency, addLedgerAmount(previous, summary.balanceAmount));
    }

    return {
      items: sortNetWorthCurrencies(
        [...balanceByCurrency.entries()].map(([currency, balanceAmount]) => ({ currency, balanceAmount })),
      ),
    };
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
