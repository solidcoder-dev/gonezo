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
}
