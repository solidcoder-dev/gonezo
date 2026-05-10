import { useState } from 'react';
import type { AccountSummaryView } from '../domain/accountView.types';

export type AccountSwitcherViewRequired = {
  accounts: AccountSummaryView[];
  selectedAccountId: string;
  disabled: boolean;
};

export type AccountSwitcherViewProvided = {
  onSelect: (accountId: string) => void;
  onRestoreAccount: (accountId: string) => Promise<void> | void;
  onAddAccount: () => void;
  onImport: () => void;
  onBackup: () => void;
};

type Props = {
  required: AccountSwitcherViewRequired;
  provided: AccountSwitcherViewProvided;
};

export function AccountSwitcherView({ required, provided }: Props) {
  const [showAccounts, setShowAccounts] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [restoringAccountId, setRestoringAccountId] = useState('');
  const activeAccounts = required.accounts.filter((account) => account.status === 'active');
  const archivedAccounts = required.accounts.filter((account) => account.status === 'archived');
  const selectedAccount = required.accounts.find((account) => account.id === required.selectedAccountId);

  return (
    <div className="account-actions" aria-busy={required.disabled}>
      <button
        type="button"
        className="account-menu-trigger"
        onClick={() => setShowAccounts(true)}
        disabled={required.disabled}
        aria-haspopup="dialog"
      >
        <span>{selectedAccount?.name ?? 'Accounts'}</span>
        <i className="bi bi-chevron-down" aria-hidden />
      </button>

      {showAccounts ? (
        <div className="sheet-backdrop" role="presentation" onClick={() => setShowAccounts(false)}>
          <div
            className="sheet-panel account-menu-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Select account"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="inline-header">
              <h3>Accounts</h3>
              <button type="button" className="text-button icon-button" onClick={() => setShowAccounts(false)} aria-label="Close account list">
                <i className="bi bi-x-lg" aria-hidden />
              </button>
            </div>
            <div className="stack account-menu-list">
              {activeAccounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  className={account.id === required.selectedAccountId ? 'chip active account-choice' : 'chip account-choice'}
                  disabled={required.disabled}
                  onClick={() => {
                    provided.onSelect(account.id);
                    setShowAccounts(false);
                  }}
                >
                  <span aria-hidden>{account.id === required.selectedAccountId ? '●' : ''}</span>
                  <span>{account.name}</span>
                  <span className="account-choice-currency">{account.currency}</span>
                </button>
              ))}
              {archivedAccounts.length > 0 ? (
                <>
                  <button
                    type="button"
                    className="text-button account-archive-toggle"
                    aria-expanded={showArchived}
                    disabled={required.disabled}
                    onClick={() => setShowArchived((current) => !current)}
                  >
                    <i className={showArchived ? 'bi bi-chevron-up' : 'bi bi-chevron-down'} aria-hidden />
                    <span>Archived ({archivedAccounts.length})</span>
                  </button>
                  {showArchived ? (
                    <div className="stack account-archived-list" aria-label="Archived accounts">
                      {archivedAccounts.map((account) => (
                        <div key={account.id} className="chip account-choice account-choice--archived">
                          <span aria-hidden />
                          <span>{account.name}</span>
                          <span className="account-choice-currency">{account.currency}</span>
                          <span className="account-choice-status">ARCH</span>
                          <button
                            type="button"
                            className="text-button icon-button account-restore-button"
                            aria-label={`Restore account ${account.name}`}
                            title="Restore account"
                            disabled={required.disabled || restoringAccountId === account.id}
                            onClick={() => {
                              setRestoringAccountId(account.id);
                              void Promise.resolve(provided.onRestoreAccount(account.id))
                                .then(() => {
                                  setShowArchived(false);
                                  setShowAccounts(false);
                                })
                                .finally(() => setRestoringAccountId(''));
                            }}
                          >
                            <i className="bi bi-arrow-counterclockwise" aria-hidden />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
            <p className="hint account-menu-actions-label">Global actions</p>
            <div className="quick-row account-menu-actions">
              <button
                type="button"
                className="text-button"
                disabled={required.disabled}
                onClick={() => {
                  provided.onAddAccount();
                  setShowAccounts(false);
                }}
              >
                Add account
              </button>
              <button
                type="button"
                className="text-button"
                disabled={required.disabled}
                onClick={() => {
                  provided.onImport();
                  setShowAccounts(false);
                }}
              >
                Import transactions
              </button>
              <button
                type="button"
                className="text-button"
                disabled={required.disabled}
                onClick={() => {
                  provided.onBackup();
                  setShowAccounts(false);
                }}
              >
                Backup
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
