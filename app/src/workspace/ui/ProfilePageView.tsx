import { BinarySwitchCardView } from '../../shared/ui/BinarySwitchCard/BinarySwitchCardView';
import type { ProfilePageViewProps } from './ProfilePageView.contract';
import styles from './ProfilePageView.module.css';

export type { ProfilePageViewProps } from './ProfilePageView.contract';

export function ProfilePageView({ required, provided }: ProfilePageViewProps) {
  const activeAccounts = required.data.accounts.filter((account) => account.status === 'active');

  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <label className="d-grid gap-2">
          Favorite account
          <select
            className={`form-select ${styles.select}`}
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

      <section className={styles.section}>
        <h2>Global actions</h2>
        <div className={styles.actions}>
          <button type="button" className="btn btn-outline-secondary" disabled={required.status.disabled} onClick={provided.commands.addAccount}>
            Add account
          </button>
          <button type="button" className="btn btn-outline-secondary" disabled={required.status.disabled} onClick={provided.commands.importBackup}>
            Restore backup
          </button>
          <button type="button" className="btn btn-outline-secondary" disabled={required.status.disabled} onClick={provided.commands.importMovements}>
            Import movements
          </button>
          <button type="button" className="btn btn-outline-secondary" disabled={required.status.disabled} onClick={provided.commands.exportBackup}>
            Backup
          </button>
          <button type="button" className="btn btn-outline-secondary" disabled={required.status.disabled} onClick={provided.commands.manageTaxonomy}>
            Taxonomy
          </button>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="profile-notifications-heading">
        <h2 id="profile-notifications-heading">Notifications</h2>
        <button type="button" className={`${styles.notificationRow} d-flex align-items-center gap-3 w-100 text-start`} onClick={provided.commands.openNotificationSettings}>
          <i className="bi bi-bell" aria-hidden />
          <span className="flex-grow-1">
            <span className="d-block fw-semibold">Notification settings</span>
            <span className="d-block small text-body-secondary">Manage notification permissions</span>
          </span>
          <i className="bi bi-chevron-right text-body-secondary" aria-hidden />
        </button>
      </section>

      <section className={styles.section} aria-labelledby="profile-experimental-heading">
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
