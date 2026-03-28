import type { AccountPageActions, AccountPageState } from '../accountPageView.contract';

type Props = {
  account: AccountPageState['account'];
  accountActions: AccountPageActions['account'];
};

export function ManageAccountSheetSection({ account, accountActions }: Props) {
  if (!account.manage.isOpen) {
    return null;
  }

  return (
    <div className="sheet-backdrop" role="presentation" onClick={accountActions.closeManageAccountSheet}>
      <section
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Manage account"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="inline-header">
          <h3>Manage account</h3>
          <button
            type="button"
            className="text-button icon-button"
            aria-label="Close account management"
            onClick={accountActions.closeManageAccountSheet}
          >
            ×
          </button>
        </div>

        <form className="stack" onSubmit={accountActions.submitRenameAccount} aria-busy={account.manage.isSubmitting}>
          <label className="stack">
            Account name
            <input
              aria-label="Manage account name"
              value={account.manage.name}
              onChange={(event) => accountActions.setManageAccountName(event.target.value)}
              placeholder="Account name"
              autoComplete="off"
            />
          </label>

          <div className="quick-row">
            <button type="submit" disabled={account.manage.isSubmitting}>
              Save name
            </button>
            <button
              type="button"
              className="text-button"
              onClick={accountActions.archiveSelectedAccount}
              disabled={account.manage.isSubmitting}
            >
              Archive account
            </button>
          </div>

          <p className="hint">Archived accounts stay visible but cannot accept new transactions.</p>

          <button
            type="button"
            className="danger-button"
            onClick={accountActions.deleteSelectedAccount}
            disabled={account.manage.isSubmitting}
          >
            Delete account
          </button>
          <p className="hint">Delete removes the account and all its transactions permanently.</p>
        </form>
      </section>
    </div>
  );
}
