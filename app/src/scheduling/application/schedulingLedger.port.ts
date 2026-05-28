export type SchedulingLedgerAccount = {
  id: string;
  status: string;
};

export type SchedulingLedgerPort = {
  getAccountOrThrow(accountId: string): SchedulingLedgerAccount;
};
