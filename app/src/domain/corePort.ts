export type CoreResult = {
  status: 'ok' | 'error';
  message: string;
};

export type CreateAccountInput = {
  name: string;
  userId?: string;
  type?: string;
  currency?: string;
};

export type CreateAccountResult = {
  id: string;
};

export interface CorePort {
  doThing(input: string): Promise<CoreResult>;
  createAccount(input: CreateAccountInput): Promise<CreateAccountResult>;
}
