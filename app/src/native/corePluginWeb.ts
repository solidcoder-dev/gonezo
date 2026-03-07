import { WebPlugin } from '@capacitor/core';
import type {
  CoreResult,
  CreateAccountInput,
  CreateAccountResult,
  PostExpenseInput,
  PostExpenseResult,
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
}
