import { SheetView } from '../../../shared/ui/SheetView';
import type { MovementAccountSelectorViewProps } from './MovementAccountSelectorView.contract';
import './MovementAccountSelectorView.css';

export type {
  MovementAccountSelectorItem,
  MovementAccountSelectorViewProps,
} from './MovementAccountSelectorView.contract';

function accountButtonLabel(accountName: string, balanceLabel: string | undefined, selected: boolean): string {
  const base = balanceLabel ? `${accountName} ${balanceLabel}` : accountName;
  return selected ? `Selected account ${base}` : base;
}

export function MovementAccountSelectorView({ required, provided }: MovementAccountSelectorViewProps) {
  return (
    <SheetView
      required={{
        config: {
          ariaLabel: 'Account for new movement',
          title: 'Account for new movement',
          closeLabel: 'Close account selector',
          panelClassName: 'import-sheet',
          contentClassName: 'movement-account-selector-content',
        },
        data: {
          body: (
            <ul className="movement-account-selector-list" aria-label="Accounts for new movement">
              {required.data.accounts.map((account) => {
                const selected = account.id === required.state.selectedAccountId;
                return (
                  <li key={account.id}>
                    <button
                      type="button"
                      className="movement-account-selector-row"
                      disabled={required.status.disabled}
                      aria-label={accountButtonLabel(account.name, account.balanceLabel, selected)}
                      onClick={() => provided.commands.selectAccount(account.id)}
                    >
                      <span className="movement-account-selector-check" aria-hidden>
                        {selected ? '✓' : ''}
                      </span>
                      <span className="movement-account-selector-name">{account.name}</span>
                      <span className="movement-account-selector-balance">
                        {account.balanceLabel ?? account.currency}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ),
        },
        state: { open: required.state.open },
        status: { disabled: required.status.disabled },
      }}
      provided={{ commands: { close: provided.commands.close } }}
    />
  );
}
