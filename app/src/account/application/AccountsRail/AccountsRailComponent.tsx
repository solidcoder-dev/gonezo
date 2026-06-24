import { useEffect, useMemo, useState } from 'react';
import type { AccountWorkspacePort } from '../accounts.port';
import type { AccountBalanceItem } from '../accountBalances.port';
import { formatCurrencyAmount } from '../../../shared/utils/formatting';
import { SheetView } from '../../../shared/ui/SheetView';
import { AccountsRailView } from '../../ui/AccountsRail/AccountsRailView';
import type { AccountsRailAccountView } from '../../ui/AccountsRail/AccountsRailView.contract';

export type AccountsRailComponentProps = {
  required: {
    context: {
      core: AccountWorkspacePort;
    };
    config: {
      enabled: boolean;
      refreshSignal: boolean;
    };
  };
  provided?: {
    events?: {
      onSelectedAccountChanged?: (accountId: string | null) => void;
      onAccountsCountChanged?: (count: number) => void;
      onAccountMutated?: (accountId: string) => void;
      onAccountDeleted?: (accountId: string) => void;
      onError?: (error: { message: string }) => void;
    };
  };
};

type AccountRailItem = AccountBalanceItem;

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

function toAccountView(account: AccountRailItem): AccountsRailAccountView {
  return {
    accountId: account.accountId,
    name: account.name,
    type: account.type,
    formattedBalance: formatCurrencyAmount(account.balanceAmount, account.currency),
    trend: account.trend && account.trend.length >= 2
      ? {
          ariaLabel: `${account.name} balance trend`,
          points: account.trend.map((point) => ({ value: Number(point.balanceAmount) })),
        }
      : undefined,
    isDefault: account.isDefault,
  };
}

export function AccountsRailComponent({ required, provided }: AccountsRailComponentProps) {
  const { core } = required.context;
  const [accounts, setAccounts] = useState<AccountRailItem[]>([]);
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('Main account');
  const [createCurrency, setCreateCurrency] = useState('USD');
  const [createOpeningBalance, setCreateOpeningBalance] = useState('');
  const [manageAccountId, setManageAccountId] = useState<string | null>(null);
  const [manageName, setManageName] = useState('');
  const [allAccountsOpen, setAllAccountsOpen] = useState(false);

  const activeAccounts = useMemo(() => accounts.filter((account) => account.status === 'active'), [accounts]);
  const selectedManageAccount = manageAccountId
    ? accounts.find((account) => account.accountId === manageAccountId) ?? null
    : null;

  async function loadAccounts(preferredAccountId?: string) {
    const [balances, currencies] = await Promise.all([
      core.accountsListBalances(),
      core.ledgerListSupportedCurrencies(),
    ]);
    setAccounts(balances.items);
    setSupportedCurrencies(currencies.items);
    if (currencies.items.length > 0 && !currencies.items.includes(createCurrency)) {
      setCreateCurrency(currencies.items[0]);
    }
    const nextActive = balances.items.filter((account) => account.status === 'active');
    provided?.events?.onAccountsCountChanged?.(nextActive.length);
    const nextSelected = preferredAccountId && nextActive.some((account) => account.accountId === preferredAccountId)
      ? preferredAccountId
      : nextActive[0]?.accountId ?? null;
    provided?.events?.onSelectedAccountChanged?.(nextSelected);
  }

  useEffect(() => {
    if (!required.config.enabled) {
      setAccounts([]);
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        await loadAccounts();
      } catch (err) {
        if (!cancelled) {
          provided?.events?.onError?.({ message: toErrorMessage(err) });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [required.config.enabled, required.config.refreshSignal, core]);

  async function submitCreateAccount(event: { preventDefault: () => void }) {
    event.preventDefault();
    const name = createName.trim();
    if (!name) {
      provided?.events?.onError?.({ message: 'Account name is required.' });
      return;
    }
    setSubmitting(true);
    try {
      const created = await core.ledgerOpenAccount({
        name,
        type: 'cash',
        currency: createCurrency,
        openingBalanceAmount: createOpeningBalance.trim() || undefined,
      });
      setCreateOpeningBalance('');
      setCreateOpen(false);
      await loadAccounts(created.id);
      provided?.events?.onAccountMutated?.(created.id);
    } catch (err) {
      provided?.events?.onError?.({ message: toErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRename(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!selectedManageAccount) {
      return;
    }
    const name = manageName.trim();
    if (!name) {
      provided?.events?.onError?.({ message: 'Account name is required.' });
      return;
    }
    setSubmitting(true);
    try {
      await core.ledgerRenameAccount({ accountId: selectedManageAccount.accountId, name });
      setManageAccountId(null);
      await loadAccounts(selectedManageAccount.accountId);
      provided?.events?.onAccountMutated?.(selectedManageAccount.accountId);
    } catch (err) {
      provided?.events?.onError?.({ message: toErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  async function archiveAccount() {
    if (!selectedManageAccount || !window.confirm(`Archive account "${selectedManageAccount.name}"?`)) {
      return;
    }
    setSubmitting(true);
    try {
      await core.ledgerArchiveAccount({ accountId: selectedManageAccount.accountId });
      setManageAccountId(null);
      await loadAccounts();
      provided?.events?.onAccountMutated?.(selectedManageAccount.accountId);
    } catch (err) {
      provided?.events?.onError?.({ message: toErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteAccount() {
    if (
      !selectedManageAccount
      || !window.confirm(`Delete account "${selectedManageAccount.name}" and all its transactions? This cannot be undone.`)
    ) {
      return;
    }
    setSubmitting(true);
    try {
      await core.ledgerDeleteAccount({ accountId: selectedManageAccount.accountId });
      setManageAccountId(null);
      await loadAccounts();
      provided?.events?.onAccountDeleted?.(selectedManageAccount.accountId);
    } catch (err) {
      provided?.events?.onError?.({ message: toErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AccountsRailView
        required={{
          config: { previewLimit: 3 },
          data: { accounts: activeAccounts.map(toAccountView) },
          state: { allAccountsOpen },
          status: { loading, disabled: submitting },
        }}
        provided={{
          commands: {
            openAllAccounts: () => setAllAccountsOpen(true),
            closeAllAccounts: () => setAllAccountsOpen(false),
            selectAccount: (accountId) => provided?.events?.onSelectedAccountChanged?.(accountId),
            manageAccount: (accountId) => {
              const account = accounts.find((item) => item.accountId === accountId);
              setManageName(account?.name ?? '');
              setManageAccountId(accountId);
            },
          },
        }}
      />

      <SheetView
        required={{
          config: {
            ariaLabel: 'Create account',
            title: 'Add account',
            closeLabel: 'Close add account sheet',
            panelClassName: 'import-sheet',
            contentClassName: 'import-sheet-content',
          },
          data: {
            body: (
              <form className="stack" onSubmit={submitCreateAccount} aria-busy={submitting}>
                <input
                  aria-label="Account name"
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  placeholder="Account name"
                  autoComplete="off"
                />
                <input
                  aria-label="Opening balance"
                  value={createOpeningBalance}
                  onChange={(event) => setCreateOpeningBalance(event.target.value)}
                  placeholder="Opening balance (optional)"
                  inputMode="decimal"
                />
                <label className="stack">
                  Currency
                  <select
                    aria-label="Currency"
                    value={createCurrency}
                    onChange={(event) => setCreateCurrency(event.target.value)}
                  >
                    {supportedCurrencies.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" disabled={submitting}>
                  {submitting ? 'Creating account...' : 'Create account'}
                </button>
              </form>
            ),
          },
          state: { open: createOpen },
          status: {},
        }}
        provided={{ commands: { close: () => setCreateOpen(false) } }}
      />

      <SheetView
        required={{
          config: {
            ariaLabel: 'Manage account',
            title: 'Manage account',
            closeLabel: 'Close account management',
          },
          data: {
            body: (
              <form className="stack" onSubmit={submitRename} aria-busy={submitting}>
                <label className="stack">
                  Account name
                  <input
                    aria-label="Manage account name"
                    value={manageName}
                    onChange={(event) => setManageName(event.target.value)}
                    placeholder="Account name"
                    autoComplete="off"
                  />
                </label>
                <div className="quick-row">
                  <button type="submit" disabled={submitting}>
                    Save name
                  </button>
                  <button type="button" className="text-button" onClick={archiveAccount} disabled={submitting}>
                    Archive account
                  </button>
                </div>
                <p className="hint">Archived accounts are hidden from the active list and cannot accept new transactions.</p>
                <button type="button" className="danger-button" onClick={deleteAccount} disabled={submitting}>
                  Delete account
                </button>
                <p className="hint">Delete removes the account and all its transactions permanently.</p>
              </form>
            ),
          },
          state: { open: Boolean(selectedManageAccount) },
          status: {},
        }}
        provided={{ commands: { close: () => setManageAccountId(null) } }}
      />
    </>
  );
}
