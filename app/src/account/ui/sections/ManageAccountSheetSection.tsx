import type { AccountPageViewProvided, AccountPageViewRequired } from '../accountPageView.contract';

export type ManageAccountSheetSectionRequired = {
  account: AccountPageViewRequired['account'];
};

export type ManageAccountSheetSectionProvided = {
  account: AccountPageViewProvided['account'];
};

type Props = {
  required: ManageAccountSheetSectionRequired;
  provided: ManageAccountSheetSectionProvided;
};

export function ManageAccountSheetSection({ required, provided }: Props) {
  if (!required.account.manage.isOpen) {
    return null;
  }

  return (
    <div className="sheet-backdrop" role="presentation" onClick={provided.account.closeManageAccountSheet}>
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
            onClick={provided.account.closeManageAccountSheet}
          >
            ×
          </button>
        </div>

        <form
          className="stack"
          onSubmit={provided.account.submitRenameAccount}
          aria-busy={required.account.manage.isSubmitting}
        >
          <label className="stack">
            Account name
            <input
              aria-label="Manage account name"
              value={required.account.manage.name}
              onChange={(event) => provided.account.setManageAccountName(event.target.value)}
              placeholder="Account name"
              autoComplete="off"
            />
          </label>

          <div className="quick-row">
            <button type="submit" disabled={required.account.manage.isSubmitting}>
              Save name
            </button>
            <button
              type="button"
              className="text-button"
              onClick={provided.account.archiveSelectedAccount}
              disabled={required.account.manage.isSubmitting}
            >
              Archive account
            </button>
          </div>

          <p className="hint">Archived accounts stay visible but cannot accept new transactions.</p>

          <button
            type="button"
            className="danger-button"
            onClick={provided.account.deleteSelectedAccount}
            disabled={required.account.manage.isSubmitting}
          >
            Delete account
          </button>
          <p className="hint">Delete removes the account and all its transactions permanently.</p>
        </form>
      </section>
    </div>
  );
}
