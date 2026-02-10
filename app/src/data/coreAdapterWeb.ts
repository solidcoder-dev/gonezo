import type { CorePort, CoreResult, CreateAccountInput, CreateAccountResult } from '../domain/corePort';

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
}
