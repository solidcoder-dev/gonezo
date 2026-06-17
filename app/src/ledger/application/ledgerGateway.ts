import type { LedgerGatewayPort } from '../application/ledgerGateway.port';

export type { LedgerGatewayPort } from '../application/ledgerGateway.port';

export function createLedgerGateway(core: LedgerGatewayPort): LedgerGatewayPort {
  return {
    ledgerListSupportedCurrencies: () => core.ledgerListSupportedCurrencies(),
    ledgerListAccounts: () => core.ledgerListAccounts(),
    ledgerGetAccountSummary: (input) => core.ledgerGetAccountSummary(input),
    ledgerGetNetWorthByCurrency: () => core.ledgerGetNetWorthByCurrency(),
    ledgerGetCashFlowSeries: (input) => core.ledgerGetCashFlowSeries(input),
    ledgerListTransactions: (input) => core.ledgerListTransactions(input),
    ledgerOpenAccount: (input) => core.ledgerOpenAccount(input),
    ledgerRenameAccount: (input) => core.ledgerRenameAccount(input),
    ledgerArchiveAccount: (input) => core.ledgerArchiveAccount(input),
    ledgerRestoreAccount: (input) => core.ledgerRestoreAccount(input),
    ledgerDeleteAccount: (input) => core.ledgerDeleteAccount(input),
    ledgerRecordExpense: (input) => core.ledgerRecordExpense(input),
    ledgerRecordIncome: (input) => core.ledgerRecordIncome(input),
    ledgerRecordTransfer: (input) => core.ledgerRecordTransfer(input),
    ledgerRecordTransferFx: (input) => core.ledgerRecordTransferFx(input),
    ledgerCreateExpenseDraft: (input) => core.ledgerCreateExpenseDraft(input),
    ledgerAddTransactionItem: (input) => core.ledgerAddTransactionItem(input),
    ledgerPostDraftTransaction: (input) => core.ledgerPostDraftTransaction(input),
    ledgerVoidTransaction: (input) => core.ledgerVoidTransaction(input),
  };
}
