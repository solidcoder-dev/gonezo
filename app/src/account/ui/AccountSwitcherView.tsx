import { useState } from 'react';
import type { AccountSummaryView } from '../domain/accountView.types';

export type AccountSwitcherViewRequired = {
  accounts: AccountSummaryView[];
  selectedAccountId: string;
  disabled: boolean;
};

export type AccountSwitcherViewProvided = {
  onSelect: (accountId: string) => void;
  onAddAccount: () => void;
  onImport: () => void;
};

type Props = {
  required: AccountSwitcherViewRequired;
  provided: AccountSwitcherViewProvided;
};

export function AccountSwitcherView({ required, provided }: Props) {
  const [showAccounts, setShowAccounts] = useState(false);

  return (
    <div className="quick-row account-actions" aria-busy={required.disabled}>
      <button
        type="button"
        className="account-menu-trigger"
        onClick={() => setShowAccounts(true)}
        disabled={required.disabled}
        aria-label="Accounts"
      >
        Accounts
      </button>

      {showAccounts ? (
        <div className="sheet-backdrop" role="presentation" onClick={() => setShowAccounts(false)}>
          <div className="sheet-panel" role="dialog" aria-modal="true" aria-label="Select account" onClick={(event) => event.stopPropagation()}>
            <div className="inline-header">
              <h3>Accounts</h3>
              <button type="button" className="text-button icon-button" onClick={() => setShowAccounts(false)} aria-label="Close account list">
                ×
              </button>
            </div>
            <div className="stack">
              {required.accounts.map((account) => (
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
                  {account.name} ({account.currency})
                </button>
              ))}
            </div>
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
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
