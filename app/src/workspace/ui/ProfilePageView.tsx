import type { ViewProps } from '../../shared/ui/ViewProps';
import type { AccountSummaryView } from '../../account/application/accountView.types';
import './ProfilePageView.css';

export type ProfilePageViewProps = ViewProps<
  Record<string, never>,
  {
    accounts: AccountSummaryView[];
  },
  {
    favoriteAccountId: string;
  },
  {
    disabled: boolean;
  },
  {
    selectFavoriteAccount: (accountId: string) => void;
    addAccount: () => void;
    importBackup: () => void;
    exportBackup: () => void;
    manageTaxonomy: () => void;
  }
>;

export function ProfilePageView({ required, provided }: ProfilePageViewProps) {
  const activeAccounts = required.data.accounts.filter((account) => account.status === 'active');

  return (
    <div className="profile-page">
      <section className="profile-section">
        <h1>Profile</h1>
        <label className="stack">
          Favorite account
          <select
            className="profile-select"
            aria-label="Favorite account"
            value={required.state.favoriteAccountId}
            disabled={required.status.disabled}
            onChange={(event) => provided.commands.selectFavoriteAccount(event.target.value)}
          >
            <option value="">No favorite account</option>
            {activeAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="profile-section">
        <h2>Global actions</h2>
        <div className="profile-actions">
          <button type="button" className="text-button" disabled={required.status.disabled} onClick={provided.commands.addAccount}>
            Add account
          </button>
          <button type="button" className="text-button" disabled={required.status.disabled} onClick={provided.commands.importBackup}>
            Import backup
          </button>
          <button type="button" className="text-button" disabled={required.status.disabled} onClick={provided.commands.exportBackup}>
            Backup
          </button>
          <button type="button" className="text-button" disabled={required.status.disabled} onClick={provided.commands.manageTaxonomy}>
            Taxonomy
          </button>
        </div>
      </section>
    </div>
  );
}
