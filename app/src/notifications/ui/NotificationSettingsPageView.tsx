import type { NotificationPermissionState } from '../application/notifications.port';
import type { NotificationSettingsState } from '../application/notificationSettings.types';
import styles from './NotificationSettingsPageView.module.css';

export type NotificationSettingsPageViewProps = {
  state: NotificationSettingsState;
  events: {
    onBack: () => void;
    onRequestPermission: () => void;
    onOpenSettings: () => void;
    onRetry: () => void;
  };
};

function permissionLabel(permission: NotificationPermissionState): string {
  if (permission === 'granted') return 'Enabled';
  if (permission === 'denied') return 'Off';
  if (permission === 'channel_blocked') return 'Blocked';
  return 'Not available';
}

function permissionActions(permission: NotificationPermissionState, events: NotificationSettingsPageViewProps['events']) {
  if (permission === 'granted') {
    return <button type="button" className="btn btn-link px-0" onClick={events.onOpenSettings}>Open device settings</button>;
  }
  if (permission === 'denied') {
    return <div className="d-flex flex-wrap align-items-center gap-3">
      <button type="button" className="btn btn-link px-0" onClick={events.onRequestPermission}>Enable notifications</button>
      <button type="button" className="btn btn-link px-0" onClick={events.onOpenSettings}>Open device settings</button>
    </div>;
  }
  if (permission === 'channel_blocked') {
    return <button type="button" className="btn btn-link px-0" onClick={events.onOpenSettings}>Open device settings</button>;
  }
  return null;
}

export function NotificationSettingsPageView({ state, events }: NotificationSettingsPageViewProps) {
  return (
    <main className="container py-3" aria-labelledby="notification-settings-title">
      <header className="d-flex align-items-center gap-2 mb-4">
        <button type="button" className="gz-icon-button" onClick={events.onBack} aria-label="Back">
          <i className="bi bi-arrow-left" aria-hidden />
        </button>
        <h1 id="notification-settings-title" className="h4 m-0">Notifications</h1>
      </header>
      <section className="d-grid gap-3" aria-labelledby="system-notifications-heading">
        <h2 id="system-notifications-heading" className="small text-uppercase text-body-secondary fw-semibold mb-0">System notifications</h2>
        <div className={`${styles.row} d-flex align-items-start gap-3`}>
          <i className="bi bi-bell text-body-secondary mt-1" aria-hidden />
          <div className={`${styles.content} flex-grow-1`}>
            <div className="d-flex align-items-start justify-content-between gap-3">
              <strong>System notifications</strong>
              <span className={`${styles.status} text-body-secondary`}>{permissionLabel(state.permission)}</span>
            </div>
            <p className="small text-body-secondary mb-2">Control whether Gonezo can send device notifications.</p>
            {!state.loading ? permissionActions(state.permission, events) : null}
          </div>
        </div>
      </section>
      {state.loading ? <p role="status" className="mt-3">Loading notification settings…</p> : null}
      {state.error ? <div role="alert" className="alert alert-danger mt-3">{state.error} <button type="button" className="btn btn-sm btn-link" onClick={events.onRetry}>Retry</button></div> : null}
    </main>
  );
}
