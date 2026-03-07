import { WebPlugin } from '@capacitor/core';
import type {
  AllocateBudgetInput,
  GetCategoryBalancesInput,
  GetCategoryBalancesResult,
  CoreResult,
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
import { CoreAdapterWeb } from '../data/coreAdapterWeb';
import type { CorePlugin } from './corePlugin';

export class CorePluginWeb extends WebPlugin implements CorePlugin {
  private readonly core = new CoreAdapterWeb();

  async doThing(options: { input: string }): Promise<CoreResult> {
    return this.core.doThing(options.input);
  }

  async createAccount(options: CreateAccountInput): Promise<CreateAccountResult> {
    return this.core.createAccount(options);
  }

  async postExpense(options: PostExpenseInput): Promise<PostExpenseResult> {
    return this.core.postExpense(options);
  }

  async postTransfer(options: PostTransferInput): Promise<PostTransferResult> {
    return this.core.postTransfer(options);
  }

  async postIncome(options: PostIncomeInput): Promise<PostIncomeResult> {
    return this.core.postIncome(options);
  }

  async createBudgetPeriod(options: CreateBudgetPeriodInput): Promise<CreateBudgetPeriodResult> {
    return this.core.createBudgetPeriod(options);
  }

  async allocateBudget(options: AllocateBudgetInput): Promise<void> {
    return this.core.allocateBudget(options);
  }

  async getCategoryBalances(options: GetCategoryBalancesInput): Promise<GetCategoryBalancesResult> {
    return this.core.getCategoryBalances(options);
  }
}
