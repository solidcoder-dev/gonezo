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
} from '../../domain/corePort';
import type { CoreAdapterWebDependencies } from './coreAdapterWebEffects';
import { listWebLedgerTransactions } from './coreAdapterWebLedgerQueries';
import type {
  WebCoreState,
  WebLedgerAccount,
  WebLedgerTransaction,
} from './coreAdapterWebState';

export type WebLedgerServiceOptions = {
  state: WebCoreState;
  dependencies: CoreAdapterWebDependencies;
};

export class WebLedgerService {
  private readonly state: WebCoreState;

  private readonly dependencies: CoreAdapterWebDependencies;

  constructor(options: WebLedgerServiceOptions) {
    this.state = options.state;
    this.dependencies = options.dependencies;
  }

  private nowIso(): string {
    return this.dependencies.clock.nowIso();
  }

  private nextId(): string {
    return this.dependencies.idGenerator.nextId();
  }

  getAccountOrThrow(accountId: string): WebLedgerAccount {
    const account = this.state.ledgerAccounts.find((item) => item.id === accountId);
    if (!account) {
      throw new Error('Account not found');
    }
    return account;
  }

  getTransactionOrThrow(transactionId: string): WebLedgerTransaction {
    const transaction = this.state.ledgerTransactions.find((item) => item.id === transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    return transaction;
  }

  ensureAccountCanPost(account: WebLedgerAccount, currency: string) {
    if (account.status !== 'active') {
      throw new Error('Archived accounts cannot accept transactions');
    }
    if (account.currency !== currency.toUpperCase()) {
      throw new Error(`Transaction currency must match account currency (${account.currency})`);
    }
  }

  private netForAccount(accountId: string): number {
    let net = 0;
    for (const tx of this.state.ledgerTransactions) {
      if (tx.accountId !== accountId || tx.status !== 'posted') {
        continue;
      }
      const amount = Number(tx.amount);
      if (Number.isNaN(amount)) {
        continue;
      }
      if (tx.type === 'income') {
        net += amount;
      }
      if (tx.type === 'expense') {
        net -= amount;
      }
      if (tx.type === 'transfer_in') {
        net += amount;
      }
      if (tx.type === 'transfer_out') {
        net -= amount;
      }
    }
    return net;
  }

  async resolveImportAccount(
    accountName: string,
    currency: string,
    createMissingAccounts: boolean,
  ): Promise<WebLedgerAccount> {
    const normalizedName = accountName.trim();
    let account = this.state.ledgerAccounts.find(
      (item) => item.name.toLowerCase() === normalizedName.toLowerCase() && item.currency === currency,
    );
    if (!account) {
      if (!createMissingAccounts) {
        throw new Error(`ACCOUNT_NOT_FOUND:${normalizedName}:${currency}`);
      }
      const opened = await this.openAccount({
        name: normalizedName,
        type: 'cash',
        currency,
      });
      account = this.state.ledgerAccounts.find((item) => item.id === opened.id);
    }
    if (!account) {
      throw new Error(`Account not found: ${normalizedName}`);
    }
    return account;
  }

  async openAccount(input: LedgerOpenAccountInput): Promise<LedgerOpenAccountResult> {
    const id = this.nextId();
    const name = input.name.trim();
    if (!name) {
      throw new Error('name is required');
    }
    const currency = input.currency.toUpperCase();
    if (!this.state.supportedCurrencies.includes(currency)) {
      throw new Error(`unsupported currency code: ${currency}`);
    }
    const openingBalanceRaw = input.openingBalanceAmount?.trim();
    const openingBalance = openingBalanceRaw ? Number(openingBalanceRaw) : 0;
    if (Number.isNaN(openingBalance)) {
      throw new Error('opening balance must be a valid number');
    }

    this.state.ledgerAccounts.push({
      id,
      name,
      type: (input.type ?? 'cash').toLowerCase(),
      currency,
      status: 'active',
      createdAt: input.createdAt ?? this.nowIso(),
    });
    if (openingBalance !== 0) {
      this.state.ledgerTransactions.push({
        id: this.nextId(),
        accountId: id,
        type: openingBalance > 0 ? 'income' : 'expense',
        status: 'posted',
        amount: Math.abs(openingBalance).toFixed(2),
        currency,
        occurredAt: input.createdAt ?? this.nowIso(),
        description: 'Opening balance',
        items: [],
      });
    }
    return { id };
  }

  async listSupportedCurrencies(): Promise<LedgerListSupportedCurrenciesResult> {
    return { items: [...this.state.supportedCurrencies] };
  }

  async renameAccount(input: LedgerRenameAccountInput): Promise<void> {
    const account = this.getAccountOrThrow(input.accountId);
    const name = input.name.trim();
    if (!name) {
      throw new Error('name is required');
    }
    account.name = name;
  }

  async archiveAccount(input: LedgerArchiveAccountInput): Promise<void> {
    const account = this.getAccountOrThrow(input.accountId);
    account.status = 'archived';
    account.archivedAt = input.archivedAt ?? this.nowIso();
  }

  async restoreAccount(input: LedgerRestoreAccountInput): Promise<void> {
    const account = this.getAccountOrThrow(input.accountId);
    account.status = 'active';
    account.archivedAt = undefined;
  }

  async deleteAccount(input: LedgerDeleteAccountInput): Promise<void> {
    const accountId = input.accountId.trim();
    if (!accountId) {
      throw new Error('accountId is required');
    }
    this.getAccountOrThrow(accountId);

    const deletedTransactionIds = new Set(
      this.state.ledgerTransactions
        .filter((tx) => tx.accountId === accountId)
        .map((tx) => tx.id),
    );

    this.state.ledgerTransactions = this.state.ledgerTransactions
      .filter((tx) => tx.accountId !== accountId);
    this.state.ledgerAccounts = this.state.ledgerAccounts
      .filter((account) => account.id !== accountId);

    for (const transactionId of deletedTransactionIds) {
      this.state.taxonomyTransactionTags.delete(transactionId);
    }
    if (deletedTransactionIds.size > 0) {
      this.state.mobillsImportFingerprintToTransactionId = new Map(
        [...this.state.mobillsImportFingerprintToTransactionId.entries()]
          .filter(([, transactionId]) => !deletedTransactionIds.has(transactionId)),
      );
    }
  }

  async listAccounts(): Promise<LedgerListAccountsResult> {
    return {
      items: this.state.ledgerAccounts.map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        currency: account.currency,
        status: account.status,
      })),
    };
  }

  async getAccountSummary(input: LedgerGetAccountSummaryInput): Promise<LedgerGetAccountSummaryResult> {
    const account = this.getAccountOrThrow(input.accountId);
    return {
      accountId: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      balanceAmount: this.netForAccount(account.id).toFixed(2),
    };
  }

  async recordExpense(input: LedgerRecordExpenseInput): Promise<LedgerRecordExpenseResult> {
    const account = this.getAccountOrThrow(input.accountId);
    this.ensureAccountCanPost(account, input.currency);
    const id = this.nextId();
    this.state.ledgerTransactions.push({
      id,
      accountId: input.accountId,
      type: 'expense',
      status: 'posted',
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      occurredAt: input.occurredAt,
      description: input.description,
      merchant: input.merchant,
      categoryId: input.categoryId,
      items: [],
    });
    return { id };
  }

  async recordIncome(input: LedgerRecordIncomeInput): Promise<LedgerRecordIncomeResult> {
    const account = this.getAccountOrThrow(input.accountId);
    this.ensureAccountCanPost(account, input.currency);
    const id = this.nextId();
    this.state.ledgerTransactions.push({
      id,
      accountId: input.accountId,
      type: 'income',
      status: 'posted',
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      occurredAt: input.occurredAt,
      description: input.description,
      merchant: input.merchant,
      categoryId: input.categoryId,
      items: [],
    });
    return { id };
  }

  async recordTransfer(input: LedgerRecordTransferInput): Promise<LedgerRecordTransferResult> {
    const fromAccount = this.getAccountOrThrow(input.fromAccountId);
    const toAccount = this.getAccountOrThrow(input.toAccountId);
    if (fromAccount.id === toAccount.id) {
      throw new Error('source and destination accounts must be different');
    }
    this.ensureAccountCanPost(fromAccount, input.currency);
    this.ensureAccountCanPost(toAccount, input.currency);

    const transferOutId = this.nextId();
    const transferInId = this.nextId();
    const currency = input.currency.toUpperCase();

    this.state.ledgerTransactions.push({
      id: transferOutId,
      accountId: fromAccount.id,
      type: 'transfer_out',
      status: 'posted',
      amount: input.amount,
      currency,
      occurredAt: input.occurredAt,
      description: input.description,
      linkedTransactionId: transferInId,
      items: [],
    });
    this.state.ledgerTransactions.push({
      id: transferInId,
      accountId: toAccount.id,
      type: 'transfer_in',
      status: 'posted',
      amount: input.amount,
      currency,
      occurredAt: input.occurredAt,
      description: input.description,
      linkedTransactionId: transferOutId,
      items: [],
    });

    return {
      transferOutId,
      transferInId,
    };
  }

  async recordTransferFx(input: LedgerRecordTransferFxInput): Promise<LedgerRecordTransferFxResult> {
    const fromAccount = this.getAccountOrThrow(input.fromAccountId);
    const toAccount = this.getAccountOrThrow(input.toAccountId);
    if (fromAccount.id === toAccount.id) {
      throw new Error('source and destination accounts must be different');
    }
    this.ensureAccountCanPost(fromAccount, input.sourceCurrency);
    this.ensureAccountCanPost(toAccount, input.destinationCurrency);

    const sourceAmount = Number(input.sourceAmount);
    const destinationAmount = Number(input.destinationAmount);
    if (!Number.isFinite(sourceAmount) || sourceAmount <= 0) {
      throw new Error('source amount must be greater than 0');
    }
    if (!Number.isFinite(destinationAmount) || destinationAmount <= 0) {
      throw new Error('destination amount must be greater than 0');
    }

    const sourceCurrency = input.sourceCurrency.toUpperCase();
    const destinationCurrency = input.destinationCurrency.toUpperCase();

    const resolvedExchangeRate = input.exchangeRate == null || input.exchangeRate.trim().length === 0
      ? destinationAmount / sourceAmount
      : Number(input.exchangeRate);
    if (!Number.isFinite(resolvedExchangeRate) || resolvedExchangeRate <= 0) {
      throw new Error('exchange rate must be greater than 0');
    }

    const normalizedSourceAmount = Number(sourceAmount.toFixed(2));
    const normalizedDestinationAmount = Number(destinationAmount.toFixed(2));

    if (sourceCurrency === destinationCurrency) {
      if (Math.abs(normalizedSourceAmount - normalizedDestinationAmount) > 0.000001) {
        throw new Error('Same-currency transfer must keep equal source and destination amounts');
      }
      if (input.exchangeRate != null && input.exchangeRate.trim().length > 0 && Math.abs(resolvedExchangeRate - 1) > 0.000001) {
        throw new Error('Same-currency transfer exchange rate must be 1');
      }
    } else {
      const expectedDestinationAmount = Number((normalizedSourceAmount * resolvedExchangeRate).toFixed(2));
      if (Math.abs(expectedDestinationAmount - normalizedDestinationAmount) > 0.000001) {
        throw new Error('Transfer amounts do not match exchange rate');
      }
    }

    const transferOutId = this.nextId();
    const transferInId = this.nextId();

    this.state.ledgerTransactions.push({
      id: transferOutId,
      accountId: fromAccount.id,
      type: 'transfer_out',
      status: 'posted',
      amount: normalizedSourceAmount.toFixed(2),
      currency: sourceCurrency,
      occurredAt: input.occurredAt,
      description: input.description,
      linkedTransactionId: transferInId,
      items: [],
    });
    this.state.ledgerTransactions.push({
      id: transferInId,
      accountId: toAccount.id,
      type: 'transfer_in',
      status: 'posted',
      amount: normalizedDestinationAmount.toFixed(2),
      currency: destinationCurrency,
      occurredAt: input.occurredAt,
      description: input.description,
      linkedTransactionId: transferOutId,
      items: [],
    });

    return {
      transferOutId,
      transferInId,
    };
  }

  async createExpenseDraft(input: LedgerCreateExpenseDraftInput): Promise<LedgerCreateExpenseDraftResult> {
    const account = this.getAccountOrThrow(input.accountId);
    this.ensureAccountCanPost(account, input.currency);
    const id = this.nextId();
    this.state.ledgerTransactions.push({
      id,
      accountId: input.accountId,
      type: input.type ?? 'expense',
      status: 'draft',
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      occurredAt: input.occurredAt,
      description: input.description,
      merchant: input.merchant,
      categoryId: input.categoryId,
      items: [],
    });
    return { id };
  }

  async addTransactionItem(input: LedgerAddTransactionItemInput): Promise<void> {
    const tx = this.state.ledgerTransactions.find((item) => item.id === input.transactionId);
    if (!tx) {
      throw new Error('Transaction not found');
    }
    if (tx.status !== 'draft') {
      throw new Error('Items can only be modified in draft status');
    }
    if (tx.currency !== input.currency.toUpperCase()) {
      throw new Error('Item currency must match transaction currency');
    }
    tx.items.push({
      id: this.nextId(),
      name: input.name,
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      categoryId: input.categoryId,
      note: input.note,
    });
  }

  async postDraftTransaction(input: LedgerPostDraftTransactionInput): Promise<void> {
    const tx = this.state.ledgerTransactions.find((item) => item.id === input.transactionId);
    if (!tx) {
      throw new Error('Transaction not found');
    }
    if (tx.status !== 'draft') {
      throw new Error('Only draft transactions can be posted');
    }
    if (tx.items.length > 0) {
      const total = tx.items.reduce((acc, item) => acc + Number(item.amount), 0);
      if (Number(tx.amount).toFixed(2) !== total.toFixed(2)) {
        throw new Error('sum(items) must match transaction amount');
      }
    }
    tx.status = 'posted';
  }

  async voidTransaction(input: LedgerVoidTransactionInput): Promise<void> {
    const tx = this.state.ledgerTransactions.find((item) => item.id === input.transactionId);
    if (!tx) {
      throw new Error('Transaction not found');
    }
    if (tx.status !== 'posted') {
      throw new Error('Only posted transactions can be voided');
    }
    tx.status = 'voided';
    if (tx.linkedTransactionId) {
      const linked = this.state.ledgerTransactions.find((item) => item.id === tx.linkedTransactionId);
      if (linked?.status === 'posted') {
        linked.status = 'voided';
      }
    }
  }

  async listTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult> {
    return listWebLedgerTransactions(
      input,
      this.state.ledgerTransactions,
      this.state.taxonomyTransactionTags,
    );
  }
}
