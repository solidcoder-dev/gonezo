import type { LedgerAccountItem } from '../../domain/corePort';
import { useMemo, useState } from 'react';

type Props = {
  accounts: LedgerAccountItem[];
  selectedAccountId: string;
  disabled: boolean;
  onSelect: (accountId: string) => void;
  onAddAccount: () => void;
};

export function AccountSwitcher({ accounts, selectedAccountId, disabled, onSelect, onAddAccount }: Props) {
  const [showAccounts, setShowAccounts] = useState(false);
  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId),
    [accounts, selectedAccountId],
  );

  return (
    <section className="stack section-gap" aria-busy={disabled}>
      <div className="inline-header">
        <div className="stack account-identity">
          <span className="hint">Current account</span>
          <strong>
            {selectedAccount ? `${selectedAccount.name} (${selectedAccount.currency})` : 'No account selected'}
          </strong>
        </div>
        <div className="quick-row">
          <button
            type="button"
            className="text-button"
            onClick={() => setShowAccounts(true)}
            disabled={disabled}
            aria-label="View accounts"
          >
            View accounts
          </button>
          <button type="button" className="text-button" onClick={onAddAccount} disabled={disabled}>
            + New account
          </button>
        </div>
      </div>

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
    </section>
  );
}
