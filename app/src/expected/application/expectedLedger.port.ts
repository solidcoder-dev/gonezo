export type ExpectedLedgerPort = {
  getAccountOrThrow(accountId: string): unknown;
  ensureAccountCanPost(account: unknown, currency: string): void;
};
