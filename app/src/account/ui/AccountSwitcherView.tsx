import type { LedgerAccountItem } from '../../shared/domain/corePort';
import { useState } from 'react';

type Props = {
  accounts: LedgerAccountItem[];
  selectedAccountId: string;
  disabled: boolean;
  onSelect: (accountId: string) => void;
  onAddAccount: () => void;
  onManageAccount: () => void;
  onImport: () => void;
};

export function AccountSwitcherView({
  accounts,
  selectedAccountId,
  disabled,
  onSelect,
  onAddAccount,
  onManageAccount,
  onImport,
}: Props) {
  const [showAccounts, setShowAccounts] = useState(false);

  return (
    <div className="quick-row account-actions" aria-busy={disabled}>
      <button
        type="button"
        className="text-button"
        onClick={() => setShowAccounts(true)}
        disabled={disabled}
        aria-label="Switch account"
      >
        Switch account
      </button>
      <button type="button" className="text-button" onClick={onAddAccount} disabled={disabled}>
        Add account
      </button>
      <button type="button" className="text-button" onClick={onManageAccount} disabled={disabled}>
        Manage
      </button>
      <button type="button" className="text-button" onClick={onImport} disabled={disabled}>
        Import
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
              {accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  className={account.id === selectedAccountId ? 'chip active account-choice' : 'chip account-choice'}
                  disabled={disabled}
                  onClick={() => {
                    onSelect(account.id);
                    setShowAccounts(false);
                  }}
                >
                  {account.name} ({account.currency})
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
