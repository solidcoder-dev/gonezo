import type { LedgerAccountItem } from '../../domain/corePort';

type Props = {
  accounts: LedgerAccountItem[];
  selectedAccountId: string;
  disabled: boolean;
  onSelect: (accountId: string) => void;
  onAddAccount: () => void;
};

export function AccountSwitcher({ accounts, selectedAccountId, disabled, onSelect, onAddAccount }: Props) {
  return (
    <section className="stack section-gap" aria-busy={disabled}>
      <div className="inline-header">
        <button type="button" className="text-button" onClick={onAddAccount} disabled={disabled}>
          + New account
        </button>
      </div>

      <div className="chip-row" role="tablist" aria-label="Account picker">
        {accounts.map((account) => (
          <button
            key={account.id}
            type="button"
            role="tab"
            aria-selected={account.id === selectedAccountId}
            className={account.id === selectedAccountId ? 'chip active' : 'chip'}
            disabled={disabled}
            onClick={() => onSelect(account.id)}
          >
            {account.name} ({account.currency})
          </button>
        ))}
      </div>
    </section>
  );
}
