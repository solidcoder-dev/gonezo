import type { AccountItem } from '../../domain/corePort';

type Props = {
  accounts: AccountItem[];
  selectedAccountId: string;
  disabled: boolean;
  onSelect: (accountId: string) => void;
};

export function AccountSwitcher({ accounts, selectedAccountId, disabled, onSelect }: Props) {
  return (
    <section className="stack section-gap" aria-busy={disabled}>
      <h2>Accounts</h2>
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
