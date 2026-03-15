import type {
  CorePort,
  CoreResult,
  AllocateBudgetInput,
  GetCategoryBalancesInput,
  GetCategoryBalancesResult,
  GetPeriodReservationsInput,
  GetPeriodReservationsResult,
  SettleReservationInput,
  ClosePeriodInput,
  ExecuteInvestmentInput,
  ExecuteInvestmentResult,
  RecordInvestmentReturnInput,
  RecordInvestmentReturnResult,
  GetInvestmentTransactionsInput,
  GetInvestmentTransactionsResult,
  GetBudgetPeriodInput,
  GetBudgetPeriodResult,
  GetBudgetLinksInput,
  GetBudgetLinksResult,
  ListAccountsResult,
  GetAccountSummaryInput,
  GetAccountSummaryResult,
  ListExpensesInput,
  ListExpensesResult,
  ListTransactionsInput,
  ListTransactionsResult,
  UpdateTransactionInput,
  UpdateTransactionResult,
  DeleteTransactionInput,
  CreatePeriodReservationsInput,
  CreateBudgetPeriodInput,
  CreateBudgetPeriodResult,
  CreateAccountInput,
  CreateAccountResult,
  PostExpenseInput,
  PostExpenseResult,
  PostIncomeInput,
  PostIncomeResult,
  PostTransferInput,
  PostTransferResult,
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
  type: 'income' | 'expense' | 'transfer';
  status: 'draft' | 'posted' | 'voided';
  amount: string;
  currency: string;
  occurredAt: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
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

  async createAccount(input: CreateAccountInput): Promise<CreateAccountResult> {
    return this.ledgerOpenAccount({
      name: input.name,
      type: input.type,
      currency: input.currency,
    });
  }

  async postExpense(input: PostExpenseInput): Promise<PostExpenseResult> {
    return this.ledgerRecordExpense({
      accountId: input.accountId,
      occurredAt: input.effectiveDate,
      amount: input.amount,
      currency: input.currency,
      description: input.merchant,
      merchant: input.merchant,
      categoryId: input.categoryId,
    });
  }

  async postTransfer(input: PostTransferInput): Promise<PostTransferResult> {
    const outId = crypto.randomUUID();
    const inId = crypto.randomUUID();
    CoreAdapterWeb.ledgerTransactions.push({
      id: outId,
      accountId: input.fromAccountId,
      type: 'transfer',
      status: 'posted',
      amount: input.amount,
      currency: input.currency,
      occurredAt: input.effectiveDate,
      description: 'Transfer out',
      merchant: 'Transfer out',
      items: [],
    });
    CoreAdapterWeb.ledgerTransactions.push({
      id: inId,
      accountId: input.toAccountId,
      type: 'transfer',
      status: 'posted',
      amount: input.amount,
      currency: input.currency,
      occurredAt: input.effectiveDate,
      description: 'Transfer in',
      merchant: 'Transfer in',
      items: [],
    });
    return { ids: [outId, inId] };
  }

  async postIncome(input: PostIncomeInput): Promise<PostIncomeResult> {
    return this.ledgerRecordIncome({
      accountId: input.accountId,
      occurredAt: input.effectiveDate,
      amount: input.amount,
      currency: input.currency,
      description: input.merchant,
      merchant: input.merchant,
      categoryId: input.categoryId,
    });
  }

  async createBudgetPeriod(_input: CreateBudgetPeriodInput): Promise<CreateBudgetPeriodResult> {
    const id = crypto.randomUUID();
    return { id };
  }

  async allocateBudget(_input: AllocateBudgetInput): Promise<void> {
    return;
  }

  async getCategoryBalances(_input: GetCategoryBalancesInput): Promise<GetCategoryBalancesResult> {
    return { items: [] };
  }

  async createPeriodReservations(_input: CreatePeriodReservationsInput): Promise<void> {
    return;
  }

  async getPeriodReservations(_input: GetPeriodReservationsInput): Promise<GetPeriodReservationsResult> {
    return { items: [] };
  }

  async settleReservation(_input: SettleReservationInput): Promise<void> {
    return;
  }

  async closePeriod(_input: ClosePeriodInput): Promise<void> {
    return;
  }

  async executeInvestment(_input: ExecuteInvestmentInput): Promise<ExecuteInvestmentResult> {
    return { id: crypto.randomUUID() };
  }

  async recordInvestmentReturn(_input: RecordInvestmentReturnInput): Promise<RecordInvestmentReturnResult> {
    return { id: crypto.randomUUID() };
  }

  async getInvestmentTransactions(_input: GetInvestmentTransactionsInput): Promise<GetInvestmentTransactionsResult> {
    return { items: [] };
  }

  async getBudgetPeriod(_input: GetBudgetPeriodInput): Promise<GetBudgetPeriodResult> {
    return {
      id: crypto.randomUUID(),
      budgetPlanId: crypto.randomUUID(),
      year: 2026,
      month: 1,
      incomeTotalAmount: '0.00',
      incomeTotalCurrency: 'USD',
      remainderAmount: '0.00',
      remainderCurrency: 'USD',
    };
  }

  async getBudgetLinks(_input: GetBudgetLinksInput): Promise<GetBudgetLinksResult> {
    return { items: [] };
  }

  async listAccounts(): Promise<ListAccountsResult> {
    const result = await this.ledgerListAccounts();
    return {
      items: result.items.map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        currency: account.currency,
      })),
    };
  }

  async getAccountSummary(input: GetAccountSummaryInput): Promise<GetAccountSummaryResult> {
    const summary = await this.ledgerGetAccountSummary({ accountId: input.accountId });
    return {
      accountId: summary.accountId,
      name: summary.name,
      type: summary.type,
      currency: summary.currency,
      netAmount: summary.balanceAmount,
    };
  }

  async listExpenses(input: ListExpensesInput): Promise<ListExpensesResult> {
    const txs = await this.ledgerListTransactions({ accountId: input.accountId, limit: input.limit });
    return {
      items: txs.items
        .filter((tx) => tx.type === 'expense')
        .map((tx) => ({
          id: tx.id,
          postedDate: tx.occurredAt,
          merchant: tx.merchant,
          amount: tx.amount,
          currency: tx.currency,
        })),
    };
  }

  async listTransactions(input: ListTransactionsInput): Promise<ListTransactionsResult> {
    const txs = await this.ledgerListTransactions({ accountId: input.accountId, limit: input.limit });
    return {
      items: txs.items
        .filter((tx): tx is typeof tx & { type: 'income' | 'expense' } => tx.type === 'income' || tx.type === 'expense')
        .map((tx) => ({
          id: tx.id,
          postedDate: tx.occurredAt,
          merchant: tx.merchant,
          amount: tx.amount,
          currency: tx.currency,
          type: tx.type,
        })),
    };
  }

  async updateTransaction(input: UpdateTransactionInput): Promise<UpdateTransactionResult> {
    const tx = CoreAdapterWeb.ledgerTransactions.find(
      (item) => item.id === input.transactionId && item.accountId === input.accountId,
    );
    if (!tx) {
      throw new Error('Transaction not found');
    }
    if (tx.status !== 'posted') {
      throw new Error('Only posted transactions can be updated');
    }
    tx.occurredAt = input.postedDate;
    tx.amount = input.amount;
    tx.currency = input.currency.toUpperCase();
    tx.type = input.type;
    tx.merchant = input.merchant;
    tx.description = input.merchant;
    return { id: input.transactionId };
  }

  async deleteTransaction(input: DeleteTransactionInput): Promise<void> {
    await this.ledgerVoidTransaction({ transactionId: input.transactionId });
  }
}
