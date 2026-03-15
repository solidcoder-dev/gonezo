import type {
  CorePort,
  CoreResult,
  LedgerOpenAccountInput,
  LedgerOpenAccountResult,
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
} from '../domain/corePort';

type MemoryLedgerAccount = {
  id: string;
  name: string;
  type: string;
  currency: string;
  status: 'active' | 'archived';
  createdAt: string;
  archivedAt?: string;
};

type MemoryLedgerTransactionItem = {
  id: string;
  name: string;
  amount: string;
  currency: string;
  categoryId?: string;
  note?: string;
};

type MemoryLedgerTransaction = {
  id: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer' | 'transfer_out' | 'transfer_in';
  status: 'draft' | 'posted' | 'voided';
  amount: string;
  currency: string;
  occurredAt: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
  linkedTransactionId?: string;
  items: MemoryLedgerTransactionItem[];
};

export class CoreAdapterWeb implements CorePort {
  private static ledgerAccounts: MemoryLedgerAccount[] = [];

  private static ledgerTransactions: MemoryLedgerTransaction[] = [];

  private accountOrThrow(accountId: string): MemoryLedgerAccount {
    const account = CoreAdapterWeb.ledgerAccounts.find((item) => item.id === accountId);
    if (!account) {
      throw new Error('Account not found');
    }
    return account;
  }

  private ensureAccountCanPost(account: MemoryLedgerAccount, currency: string) {
    if (account.status !== 'active') {
      throw new Error('Archived accounts cannot accept transactions');
    }
    if (account.currency !== currency.toUpperCase()) {
      throw new Error(`Transaction currency must match account currency (${account.currency})`);
    }
  }

  private netForAccount(accountId: string): number {
    let net = 0;
    for (const tx of CoreAdapterWeb.ledgerTransactions) {
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

  async doThing(input: string): Promise<CoreResult> {
    return {
      status: 'ok',
      message: `web adapter ok: ${input}`,
    };
  }

  async ledgerOpenAccount(input: LedgerOpenAccountInput): Promise<LedgerOpenAccountResult> {
    const id = crypto.randomUUID();
    const name = input.name.trim();
    if (!name) {
      throw new Error('name is required');
    }
    CoreAdapterWeb.ledgerAccounts.push({
      id,
      name,
      type: (input.type ?? 'cash').toLowerCase(),
      currency: (input.currency ?? 'USD').toUpperCase(),
      status: 'active',
      createdAt: input.createdAt ?? new Date().toISOString(),
    });
    return { id };
  }

  async ledgerRenameAccount(input: LedgerRenameAccountInput): Promise<void> {
    const account = this.accountOrThrow(input.accountId);
    const name = input.name.trim();
    if (!name) {
      throw new Error('name is required');
    }
    account.name = name;
  }

  async ledgerArchiveAccount(input: LedgerArchiveAccountInput): Promise<void> {
    const account = this.accountOrThrow(input.accountId);
    account.status = 'archived';
    account.archivedAt = input.archivedAt ?? new Date().toISOString();
  }

  async ledgerListAccounts(): Promise<LedgerListAccountsResult> {
    return {
      items: CoreAdapterWeb.ledgerAccounts.map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        currency: account.currency,
        status: account.status,
      })),
    };
  }

  async ledgerGetAccountSummary(input: LedgerGetAccountSummaryInput): Promise<LedgerGetAccountSummaryResult> {
    const account = this.accountOrThrow(input.accountId);
    return {
      accountId: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      balanceAmount: this.netForAccount(account.id).toFixed(2),
    };
  }

  async ledgerRecordExpense(input: LedgerRecordExpenseInput): Promise<LedgerRecordExpenseResult> {
    const account = this.accountOrThrow(input.accountId);
    this.ensureAccountCanPost(account, input.currency);
    const id = crypto.randomUUID();
    CoreAdapterWeb.ledgerTransactions.push({
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

  async ledgerRecordIncome(input: LedgerRecordIncomeInput): Promise<LedgerRecordIncomeResult> {
    const account = this.accountOrThrow(input.accountId);
    this.ensureAccountCanPost(account, input.currency);
    const id = crypto.randomUUID();
    CoreAdapterWeb.ledgerTransactions.push({
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

  async ledgerRecordTransfer(input: LedgerRecordTransferInput): Promise<LedgerRecordTransferResult> {
    const fromAccount = this.accountOrThrow(input.fromAccountId);
    const toAccount = this.accountOrThrow(input.toAccountId);
    if (fromAccount.id === toAccount.id) {
      throw new Error('source and destination accounts must be different');
    }
    this.ensureAccountCanPost(fromAccount, input.currency);
    this.ensureAccountCanPost(toAccount, input.currency);

    const transferOutId = crypto.randomUUID();
    const transferInId = crypto.randomUUID();
    const currency = input.currency.toUpperCase();

    CoreAdapterWeb.ledgerTransactions.push({
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
    CoreAdapterWeb.ledgerTransactions.push({
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

  async ledgerCreateExpenseDraft(input: LedgerCreateExpenseDraftInput): Promise<LedgerCreateExpenseDraftResult> {
    const account = this.accountOrThrow(input.accountId);
    this.ensureAccountCanPost(account, input.currency);
    const id = crypto.randomUUID();
    CoreAdapterWeb.ledgerTransactions.push({
      id,
      accountId: input.accountId,
      type: 'expense',
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

  async ledgerAddTransactionItem(input: LedgerAddTransactionItemInput): Promise<void> {
    const tx = CoreAdapterWeb.ledgerTransactions.find((item) => item.id === input.transactionId);
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
      id: crypto.randomUUID(),
      name: input.name,
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      categoryId: input.categoryId,
      note: input.note,
    });
  }

  async ledgerPostDraftTransaction(input: LedgerPostDraftTransactionInput): Promise<void> {
    const tx = CoreAdapterWeb.ledgerTransactions.find((item) => item.id === input.transactionId);
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

  async ledgerVoidTransaction(input: LedgerVoidTransactionInput): Promise<void> {
    const tx = CoreAdapterWeb.ledgerTransactions.find((item) => item.id === input.transactionId);
    if (!tx) {
      throw new Error('Transaction not found');
    }
    if (tx.status !== 'posted') {
      throw new Error('Only posted transactions can be voided');
    }
    tx.status = 'voided';
    if (tx.linkedTransactionId) {
      const linked = CoreAdapterWeb.ledgerTransactions.find((item) => item.id === tx.linkedTransactionId);
      if (linked?.status === 'posted') {
        linked.status = 'voided';
      }
    }
  }

  async ledgerListTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult> {
    const limit = input.limit ?? 20;
    const includeVoided = input.includeVoided === true;
    const items = CoreAdapterWeb.ledgerTransactions
      .filter((tx) => tx.accountId === input.accountId)
      .filter((tx) => includeVoided || tx.status !== 'voided')
      .filter((tx) => !input.fromDate || tx.occurredAt >= input.fromDate)
      .filter((tx) => !input.toDate || tx.occurredAt <= input.toDate)
      .filter((tx) => !input.categoryId || tx.categoryId === input.categoryId)
      .filter((tx) => !input.merchant || tx.merchant?.toLowerCase() === input.merchant.toLowerCase())
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, limit)
      .map((tx) => ({
        id: tx.id,
        accountId: tx.accountId,
        type: tx.type,
        status: tx.status,
        amount: tx.amount,
        currency: tx.currency,
        occurredAt: tx.occurredAt,
        description: tx.description,
        merchant: tx.merchant,
        categoryId: tx.categoryId,
        items: tx.items.map((item) => ({ ...item })),
      }));

    return { items };
  }
}
