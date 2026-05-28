import { useState } from 'react';
import { SheetView } from '../../../shared/ui/SheetView';
import type { AccountSummaryView } from '../../application/accountView.types';

export type AccountSwitcherViewRequired = {
  accounts: AccountSummaryView[];
  selectedAccountId: string;
  defaultAccountId: string | null;
  disabled: boolean;
};

export type AccountSwitcherViewProvided = {
  onSelect: (accountId: string) => void;
  onRestoreAccount: (accountId: string) => Promise<void> | void;
  onSetDefaultAccount: (accountId: string) => Promise<void> | void;
  onClearDefaultAccount: () => Promise<void> | void;
  onAddAccount: () => void;
  onManageTaxonomy: () => void;
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
  const [defaultUpdatingAccountId, setDefaultUpdatingAccountId] = useState('');
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
        <SheetView
          required={{
            config: {
              ariaLabel: 'Select account',
              title: 'Accounts',
              closeLabel: 'Close account list',
              panelClassName: 'account-menu-sheet',
            },
            data: {
              body: (
                <>
                  <div className="stack account-menu-list">
                    {activeAccounts.map((account) => {
                      const isSelected = account.id === required.selectedAccountId;
                      const isDefault = account.id === required.defaultAccountId;
                      return (
                        <div
                          key={account.id}
                          className={isSelected ? 'chip active account-choice account-choice--active' : 'chip account-choice account-choice--active'}
                        >
                          <button
                            type="button"
                            className="account-choice-main"
                            disabled={required.disabled}
                            onClick={() => {
                              provided.onSelect(account.id);
                              setShowAccounts(false);
                            }}
                          >
                            <span aria-hidden>{isSelected ? '●' : ''}</span>
                            <span>{account.name}</span>
                            <span className="account-choice-currency">{account.currency}</span>
                          </button>
                          <button
                            type="button"
                            className={isDefault ? 'text-button icon-button account-default-button is-default' : 'text-button icon-button account-default-button'}
                            aria-label={isDefault ? `Clear default account ${account.name}` : `Set ${account.name} as default account`}
                            title={isDefault ? 'Clear default account' : 'Set as default account'}
                            disabled={required.disabled || defaultUpdatingAccountId === account.id}
                            onClick={() => {
                              setDefaultUpdatingAccountId(account.id);
                              void Promise.resolve()
                                .then(() => (
                                  isDefault
                                    ? provided.onClearDefaultAccount()
                                    : provided.onSetDefaultAccount(account.id)
                                ))
                                .finally(() => setDefaultUpdatingAccountId(''));
                            }}
                          >
                            <i className={isDefault ? 'bi bi-star-fill' : 'bi bi-star'} aria-hidden />
                          </button>
                        </div>
                      );
                    })}
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
                      Import backup
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      disabled={required.disabled}
                      onClick={() => {
                        provided.onManageTaxonomy();
                        setShowAccounts(false);
                      }}
                    >
                      Taxonomy
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
                </>
              ),
            },
            state: { open: true },
            status: {},
          }}
          provided={{ commands: { close: () => setShowAccounts(false) } }}
        />
      ) : null}
    </div>
  );
}
