import { useCallback } from 'react';
import type { LedgerPort } from './ledger.port';

export type LedgerAccountOperationsPort = Pick<LedgerPort,
  | 'ledgerListSupportedCurrencies'
  | 'ledgerListAccounts'
  | 'ledgerGetAccountSummary'
  | 'ledgerOpenAccount'
  | 'ledgerRenameAccount'
  | 'ledgerArchiveAccount'
  | 'ledgerRestoreAccount'
  | 'ledgerDeleteAccount'
>;

export function useLedgerAccounts(gateway: LedgerAccountOperationsPort) {
  const listSupportedCurrencies = useCallback(() => gateway.ledgerListSupportedCurrencies(), [gateway]);
  const listAccounts = useCallback(() => gateway.ledgerListAccounts(), [gateway]);
  const getAccountSummary = useCallback(
    (input: { accountId: string }) => gateway.ledgerGetAccountSummary(input),
    [gateway],
  );
  const openAccount = useCallback(
    (input: {
      name: string;
      type?: string;
      currency: string;
      createdAt?: string;
      openingBalanceAmount?: string;
    }) => gateway.ledgerOpenAccount(input),
    [gateway],
  );
  const renameAccount = useCallback(
    (input: { accountId: string; name: string }) => gateway.ledgerRenameAccount(input),
    [gateway],
  );
  const archiveAccount = useCallback(
    (input: { accountId: string; archivedAt?: string }) => gateway.ledgerArchiveAccount(input),
    [gateway],
  );
  const restoreAccount = useCallback(
    (input: { accountId: string }) => gateway.ledgerRestoreAccount(input),
    [gateway],
  );
  const deleteAccount = useCallback(
    (input: { accountId: string }) => gateway.ledgerDeleteAccount(input),
    [gateway],
  );

  return {
    listSupportedCurrencies,
    listAccounts,
    getAccountSummary,
    openAccount,
    renameAccount,
    archiveAccount,
    restoreAccount,
    deleteAccount,
  };
}
