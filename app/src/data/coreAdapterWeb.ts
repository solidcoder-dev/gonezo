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
}
