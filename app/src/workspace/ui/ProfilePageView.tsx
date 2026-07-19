import { BinarySwitchCardView } from '../../shared/ui/BinarySwitchCard/BinarySwitchCardView';
import type { ProfilePageViewProps } from './ProfilePageView.contract';
import './ProfilePageView.css';

export type { ProfilePageViewProps } from './ProfilePageView.contract';

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

      <section className="profile-section profile-experimental-section" aria-labelledby="profile-experimental-heading">
        <h2 id="profile-experimental-heading">Experimental</h2>
        <BinarySwitchCardView
          required={{
            config: {
              switchId: 'voice-movement-entry-experiment',
              title: 'Voice movement entry',
              description: required.data.voiceMovementExperiment.description,
              ariaLabel: 'Enable voice movement entry experiment',
              iconClassName: 'bi bi-flask',
            },
            data: {},
            state: {
              value: required.data.voiceMovementExperiment.enabled,
            },
            status: {
              disabled: required.status.disabled || required.data.voiceMovementExperiment.disabled,
            },
          }}
          provided={{
            commands: {
              setValue: provided.commands.setVoiceMovementExperimentEnabled,
            },
          }}
        />
      </section>
    </div>
  );
}
