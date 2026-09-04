import type { LedgerAccountItem } from '../../ledger/application/ledger.port';

type AccountReader = {
  listAccounts: () => Promise<{ items: LedgerAccountItem[] }>;
  getAccountSummary: (input: { accountId: string }) => Promise<{ currency: string }>;
};

export async function refreshTransactionAccountSnapshot(
  accountReader: AccountReader,
  accountId: string | null,
  setAccounts: (accounts: LedgerAccountItem[]) => void,
  setCurrency: (currency: string) => void,
  setTransferTarget: (accountId: string) => void,
  setDefaultTargetForAccounts: (accounts: LedgerAccountItem[], accountId: string) => void,
) {
  const result = await accountReader.listAccounts();
  setAccounts(result.items);
  if (!accountId) {
    setCurrency('USD');
    setTransferTarget('');
    return;
  }
  const selected = result.items.find((account) => account.id === accountId);
  if (!selected) {
    setCurrency('USD');
    setTransferTarget('');
    return;
  }
  const summary = await accountReader.getAccountSummary({ accountId });
  setCurrency(summary.currency);
  setDefaultTargetForAccounts(result.items, accountId);
}
