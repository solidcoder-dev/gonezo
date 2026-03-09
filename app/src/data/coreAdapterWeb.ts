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
} from '../domain/corePort';

type MemoryAccount = {
  id: string;
  userId: string;
  name: string;
  type: string;
  currency: string;
};

type MemoryTx = {
  id: string;
  accountId: string;
  postedDate: string;
  amount: string;
  currency: string;
  type: 'income' | 'expense' | 'transfer';
  merchant?: string;
};

export class CoreAdapterWeb implements CorePort {
  private static accounts: MemoryAccount[] = [];

  private static transactions: MemoryTx[] = [];

  async doThing(input: string): Promise<CoreResult> {
    return {
      status: 'ok',
      message: `web adapter ok: ${input}`,
    };
  }

  async createAccount(input: CreateAccountInput): Promise<CreateAccountResult> {
    const id = crypto.randomUUID();
    CoreAdapterWeb.accounts.push({
      id,
      userId: input.userId ?? crypto.randomUUID(),
      name: input.name,
      type: input.type ?? 'cash',
      currency: input.currency ?? 'USD',
    });
    return { id };
  }

  async postExpense(input: PostExpenseInput): Promise<PostExpenseResult> {
    const id = crypto.randomUUID();
    CoreAdapterWeb.transactions.push({
      id,
      accountId: input.accountId,
      postedDate: input.postedDate,
      amount: input.amount,
      currency: input.currency,
      type: 'expense',
      merchant: input.merchant,
    });
    return { id };
  }

  async postTransfer(input: PostTransferInput): Promise<PostTransferResult> {
    const outId = crypto.randomUUID();
    const inId = crypto.randomUUID();
    CoreAdapterWeb.transactions.push({
      id: outId,
      accountId: input.fromAccountId,
      postedDate: input.postedDate,
      amount: input.amount,
      currency: input.currency,
      type: 'transfer',
      merchant: 'Transfer out',
    });
    CoreAdapterWeb.transactions.push({
      id: inId,
      accountId: input.toAccountId,
      postedDate: input.postedDate,
      amount: input.amount,
      currency: input.currency,
      type: 'transfer',
      merchant: 'Transfer in',
    });
    return { ids: [outId, inId] };
  }

  async postIncome(input: PostIncomeInput): Promise<PostIncomeResult> {
    const id = crypto.randomUUID();
    CoreAdapterWeb.transactions.push({
      id,
      accountId: input.accountId,
      postedDate: input.postedDate,
      amount: input.amount,
      currency: input.currency,
      type: 'income',
      merchant: input.merchant,
    });
    return { id };
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
    return {
      items: CoreAdapterWeb.accounts.map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        currency: account.currency,
      })),
    };
  }

  async getAccountSummary(input: GetAccountSummaryInput): Promise<GetAccountSummaryResult> {
    const account = CoreAdapterWeb.accounts.find((item) => item.id === input.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    let net = 0;
    for (const tx of CoreAdapterWeb.transactions.filter((item) => item.accountId === input.accountId)) {
      const amount = Number(tx.amount);
      if (tx.type === 'income') {
        net += amount;
      }
      if (tx.type === 'expense') {
        net -= amount;
      }
    }

    return {
      accountId: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      netAmount: net.toFixed(2),
    };
  }

  async listExpenses(input: ListExpensesInput): Promise<ListExpensesResult> {
    const limit = input.limit ?? 10;
    const items = CoreAdapterWeb.transactions
      .filter((tx) => tx.accountId === input.accountId && tx.type === 'expense')
      .sort((a, b) => b.postedDate.localeCompare(a.postedDate))
      .slice(0, limit)
      .map((tx) => ({
        id: tx.id,
        postedDate: tx.postedDate,
        merchant: tx.merchant,
        amount: tx.amount,
        currency: tx.currency,
      }));

    return { items };
  }

  async listTransactions(input: ListTransactionsInput): Promise<ListTransactionsResult> {
    const limit = input.limit ?? 10;
    const items = CoreAdapterWeb.transactions
      .filter(
        (tx): tx is MemoryTx & { type: 'income' | 'expense' } =>
          tx.accountId === input.accountId && (tx.type === 'expense' || tx.type === 'income')
      )
      .sort((a, b) => b.postedDate.localeCompare(a.postedDate))
      .slice(0, limit)
      .map((tx) => ({
        id: tx.id,
        postedDate: tx.postedDate,
        merchant: tx.merchant,
        amount: tx.amount,
        currency: tx.currency,
        type: tx.type,
      }));

    return { items };
  }

  async updateTransaction(input: UpdateTransactionInput): Promise<UpdateTransactionResult> {
    const index = CoreAdapterWeb.transactions.findIndex(
      (tx) => tx.id === input.transactionId && tx.accountId === input.accountId
    );
    if (index < 0) {
      throw new Error('Transaction not found');
    }

    CoreAdapterWeb.transactions[index] = {
      ...CoreAdapterWeb.transactions[index],
      postedDate: input.postedDate,
      amount: input.amount,
      currency: input.currency,
      type: input.type,
      merchant: input.merchant,
    };

    return { id: input.transactionId };
  }

  async deleteTransaction(input: DeleteTransactionInput): Promise<void> {
    CoreAdapterWeb.transactions = CoreAdapterWeb.transactions.filter(
      (tx) => !(tx.id === input.transactionId && tx.accountId === input.accountId)
    );
  }
}
