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

export class CoreAdapterWeb implements CorePort {
  async doThing(input: string): Promise<CoreResult> {
    return {
      status: 'ok',
      message: `web adapter ok: ${input}`,
    };
  }

  async createAccount(_input: CreateAccountInput): Promise<CreateAccountResult> {
    const id = crypto.randomUUID();
    return { id };
  }

  async postExpense(_input: PostExpenseInput): Promise<PostExpenseResult> {
    const id = crypto.randomUUID();
    return { id };
  }

  async postTransfer(_input: PostTransferInput): Promise<PostTransferResult> {
    return { ids: [crypto.randomUUID(), crypto.randomUUID()] };
  }

  async postIncome(_input: PostIncomeInput): Promise<PostIncomeResult> {
    const id = crypto.randomUUID();
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
}
