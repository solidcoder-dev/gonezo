import { WebPlugin } from '@capacitor/core';
import type { CoreResult, CreateAccountInput, CreateAccountResult } from '../domain/corePort';
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
}
