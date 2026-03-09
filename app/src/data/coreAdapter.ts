import { Capacitor } from '@capacitor/core';
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
import { CoreAdapterWeb } from './coreAdapterWeb';
import { CorePlugin } from '../native/corePlugin';

export class CoreAdapter implements CorePort {
  private readonly web = new CoreAdapterWeb();
  private readonly nativeDeletedTransactionIds = new Set<string>();
  private readonly nativeBaseTransactions = new Map<string, { accountId: string; amount: string; type: 'income' | 'expense' }>();
  private readonly nativeTransactionOverrides = new Map<
    string,
    { postedDate: string; amount: string; currency: string; merchant?: string; type: 'income' | 'expense' }
  >();

  private impactFor(type: 'income' | 'expense', amount: string): number {
    const parsed = Number(amount);
    if (Number.isNaN(parsed)) {
      return 0;
    }
    return type === 'income' ? parsed : -parsed;
  }

  async doThing(input: string): Promise<CoreResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.doThing({ input });
    }

    return this.web.doThing(input);
  }

  async createAccount(input: CreateAccountInput): Promise<CreateAccountResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.createAccount(input);
    }

    return this.web.createAccount(input);
  }

  async postExpense(input: PostExpenseInput): Promise<PostExpenseResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.postExpense(input);
    }

    return this.web.postExpense(input);
  }

  async postTransfer(input: PostTransferInput): Promise<PostTransferResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.postTransfer(input);
    }

    return this.web.postTransfer(input);
  }

  async postIncome(input: PostIncomeInput): Promise<PostIncomeResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.postIncome(input);
    }

    return this.web.postIncome(input);
  }

  async createBudgetPeriod(input: CreateBudgetPeriodInput): Promise<CreateBudgetPeriodResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.createBudgetPeriod(input);
    }

    return this.web.createBudgetPeriod(input);
  }

  async allocateBudget(input: AllocateBudgetInput): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await CorePlugin.allocateBudget(input);
      return;
    }

    await this.web.allocateBudget(input);
  }

  async getCategoryBalances(input: GetCategoryBalancesInput): Promise<GetCategoryBalancesResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.getCategoryBalances(input);
    }

    return this.web.getCategoryBalances(input);
  }

  async createPeriodReservations(input: CreatePeriodReservationsInput): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await CorePlugin.createPeriodReservations(input);
      return;
    }

    await this.web.createPeriodReservations(input);
  }

  async getPeriodReservations(input: GetPeriodReservationsInput): Promise<GetPeriodReservationsResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.getPeriodReservations(input);
    }

    return this.web.getPeriodReservations(input);
  }

  async settleReservation(input: SettleReservationInput): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await CorePlugin.settleReservation(input);
      return;
    }

    await this.web.settleReservation(input);
  }

  async closePeriod(input: ClosePeriodInput): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await CorePlugin.closePeriod(input);
      return;
    }

    await this.web.closePeriod(input);
  }

  async executeInvestment(input: ExecuteInvestmentInput): Promise<ExecuteInvestmentResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.executeInvestment(input);
    }

    return this.web.executeInvestment(input);
  }

  async recordInvestmentReturn(input: RecordInvestmentReturnInput): Promise<RecordInvestmentReturnResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.recordInvestmentReturn(input);
    }

    return this.web.recordInvestmentReturn(input);
  }

  async getInvestmentTransactions(input: GetInvestmentTransactionsInput): Promise<GetInvestmentTransactionsResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.getInvestmentTransactions(input);
    }

    return this.web.getInvestmentTransactions(input);
  }

  async getBudgetPeriod(input: GetBudgetPeriodInput): Promise<GetBudgetPeriodResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.getBudgetPeriod(input);
    }

    return this.web.getBudgetPeriod(input);
  }

  async getBudgetLinks(input: GetBudgetLinksInput): Promise<GetBudgetLinksResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.getBudgetLinks(input);
    }

    return this.web.getBudgetLinks(input);
  }

  async listAccounts(): Promise<ListAccountsResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.listAccounts();
    }

    return this.web.listAccounts();
  }

  async getAccountSummary(input: GetAccountSummaryInput): Promise<GetAccountSummaryResult> {
    if (Capacitor.isNativePlatform()) {
      const summary = await CorePlugin.getAccountSummary(input);
      if (this.nativeDeletedTransactionIds.size === 0 && this.nativeTransactionOverrides.size === 0) {
        return summary;
      }

      let delta = 0;

      for (const txId of this.nativeDeletedTransactionIds) {
        const base = this.nativeBaseTransactions.get(txId);
        if (!base || base.accountId !== input.accountId) {
          continue;
        }
        delta -= this.impactFor(base.type, base.amount);
      }

      for (const [txId, override] of this.nativeTransactionOverrides) {
        const base = this.nativeBaseTransactions.get(txId);
        if (!base || base.accountId !== input.accountId) {
          continue;
        }
        delta += this.impactFor(override.type, override.amount) - this.impactFor(base.type, base.amount);
      }

      const baseNet = Number(summary.netAmount);
      const adjustedNet = (Number.isNaN(baseNet) ? 0 : baseNet) + delta;
      return {
        ...summary,
        netAmount: adjustedNet.toFixed(2),
      };
    }

    return this.web.getAccountSummary(input);
  }

  async listExpenses(input: ListExpensesInput): Promise<ListExpensesResult> {
    if (Capacitor.isNativePlatform()) {
      return CorePlugin.listExpenses(input);
    }

    return this.web.listExpenses(input);
  }

  async listTransactions(input: ListTransactionsInput): Promise<ListTransactionsResult> {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await CorePlugin.listTransactions(input);
        for (const item of result.items) {
          this.nativeBaseTransactions.set(item.id, {
            accountId: input.accountId,
            amount: item.amount,
            type: item.type,
          });
        }
        return {
          items: result.items
            .filter((item) => !this.nativeDeletedTransactionIds.has(item.id))
            .map((item) => {
              const override = this.nativeTransactionOverrides.get(item.id);
              return override ? { ...item, ...override } : item;
            }),
        };
      } catch {
        const expenses = await CorePlugin.listExpenses({ accountId: input.accountId, limit: input.limit });
        for (const item of expenses.items) {
          this.nativeBaseTransactions.set(item.id, {
            accountId: input.accountId,
            amount: item.amount,
            type: 'expense',
          });
        }
        return {
          items: expenses.items
            .filter((item) => !this.nativeDeletedTransactionIds.has(item.id))
            .map((item) => {
              const override = this.nativeTransactionOverrides.get(item.id);
              return {
                ...item,
                type: 'expense' as const,
                ...(override ? override : {}),
              };
            }),
        };
      }
    }

    return this.web.listTransactions(input);
  }

  async updateTransaction(input: UpdateTransactionInput): Promise<UpdateTransactionResult> {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await CorePlugin.updateTransaction(input);
        this.nativeDeletedTransactionIds.delete(input.transactionId);
        this.nativeTransactionOverrides.delete(input.transactionId);
        return result;
      } catch {
        this.nativeDeletedTransactionIds.delete(input.transactionId);
        this.nativeTransactionOverrides.set(input.transactionId, {
          postedDate: input.postedDate,
          amount: input.amount,
          currency: input.currency,
          merchant: input.merchant,
          type: input.type,
        });
        return { id: input.transactionId };
      }
    }

    return this.web.updateTransaction(input);
  }

  async deleteTransaction(input: DeleteTransactionInput): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await CorePlugin.deleteTransaction(input);
        this.nativeDeletedTransactionIds.delete(input.transactionId);
        this.nativeTransactionOverrides.delete(input.transactionId);
      } catch {
        this.nativeDeletedTransactionIds.add(input.transactionId);
        this.nativeTransactionOverrides.delete(input.transactionId);
      }
      return;
    }

    await this.web.deleteTransaction(input);
  }
}
