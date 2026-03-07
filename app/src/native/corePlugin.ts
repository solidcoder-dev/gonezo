import { registerPlugin } from '@capacitor/core';
import type {
  CoreResult,
  CreateAccountInput,
  CreateAccountResult,
  PostExpenseInput,
  PostExpenseResult,
  PostTransferInput,
  PostTransferResult,
} from '../domain/corePort';

export interface CorePlugin {
  doThing(options: { input: string }): Promise<CoreResult>;
  createAccount(options: CreateAccountInput): Promise<CreateAccountResult>;
  postExpense(options: PostExpenseInput): Promise<PostExpenseResult>;
  postTransfer(options: PostTransferInput): Promise<PostTransferResult>;
}

export const CorePlugin = registerPlugin<CorePlugin>('CorePlugin', {
  web: () => import('./corePluginWeb').then((m) => new m.CorePluginWeb()),
});
