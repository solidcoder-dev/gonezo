import { registerPlugin } from '@capacitor/core';
import type {
  AllocateBudgetInput,
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

export interface CorePlugin {
  doThing(options: { input: string }): Promise<CoreResult>;
  createAccount(options: CreateAccountInput): Promise<CreateAccountResult>;
  postExpense(options: PostExpenseInput): Promise<PostExpenseResult>;
  postTransfer(options: PostTransferInput): Promise<PostTransferResult>;
  postIncome(options: PostIncomeInput): Promise<PostIncomeResult>;
  createBudgetPeriod(options: CreateBudgetPeriodInput): Promise<CreateBudgetPeriodResult>;
  allocateBudget(options: AllocateBudgetInput): Promise<void>;
}

export const CorePlugin = registerPlugin<CorePlugin>('CorePlugin', {
  web: () => import('./corePluginWeb').then((m) => new m.CorePluginWeb()),
});
