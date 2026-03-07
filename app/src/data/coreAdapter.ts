import { Capacitor } from '@capacitor/core';
import type {
  CorePort,
  CoreResult,
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
}
