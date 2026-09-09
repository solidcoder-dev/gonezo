import type { NotificationItem, NotificationsFilter } from '../application/notifications.port';
import type { NotificationsPageState } from '../application/notificationsPage.types';

export type NotificationsPageViewProps = {
  state: NotificationsPageState;
  events: {
    onBack: () => void;
    onFilterChanged: (filter: NotificationsFilter) => void;
    onLoadMore: () => void;
    onMarkRead: (id: string) => void;
    onOpen: (item: NotificationItem) => void;
    onMarkAllRead: () => void;
    onOpenNotificationSettings: () => void;
    onRetry: () => void;
  };
};

function typeText(item: NotificationItem): string {
  return item.type === 'scheduled_confirmation_required' ? 'Scheduled movement requires confirmation' : 'A scheduled movement could not be processed';
}

export function NotificationsPageView({ state, events }: NotificationsPageViewProps) {
  const hasItems = state.items.length > 0;
  return (
    <main className="container py-3" aria-labelledby="notifications-title">
      <header className="d-flex align-items-center justify-content-between gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <button type="button" className="gz-icon-button" onClick={events.onBack} aria-label="Back">
            <i className="bi bi-arrow-left" aria-hidden />
          </button>
          <h1 id="notifications-title" className="h4 m-0">Notifications</h1>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <button type="button" className="gz-icon-button" onClick={events.onOpenNotificationSettings} aria-label="Notification settings">
            <i className="bi bi-gear" aria-hidden />
          </button>
          {hasItems ? <button type="button" className="btn btn-outline-secondary btn-sm" onClick={events.onMarkAllRead} disabled={!state.snapshotCursor || state.unreadCount === 0}>Mark all as read</button> : null}
        </div>
      </header>
      {hasItems ? <div className="btn-group mb-3" role="group" aria-label="Notification filter">
        {(['all', 'unread'] as const).map((filter) => <button key={filter} type="button" className={`btn btn-sm ${state.filter === filter ? 'btn-primary' : 'btn-outline-primary'}`} aria-pressed={state.filter === filter} onClick={() => events.onFilterChanged(filter)}>{filter === 'all' ? 'All' : 'Unread'}</button>)}
      </div> : null}
      {state.loading ? <p role="status">Loading notifications…</p> : null}
      {state.error ? <div role="alert" className="alert alert-danger">{state.error} <button type="button" className="btn btn-sm btn-link" onClick={events.onRetry}>Retry</button></div> : null}
      {!state.loading && !state.error && state.items.length === 0 ? <div className="d-flex flex-column align-items-center justify-content-center text-center py-5">
        <i className="bi bi-bell text-body-secondary mb-3" aria-hidden />
        <p className="mb-2 fw-semibold">No notifications yet</p>
        <p className="mb-0 text-body-secondary">We'll let you know when something needs your attention.</p>
      </div> : null}
      <div className="list-group list-group-flush">
        {state.items.map((item) => (
          <div key={item.id} className={`list-group-item px-0 d-flex gap-2 ${!item.readAt && !item.withdrawnAt ? 'fw-semibold' : ''}`}>
            <button type="button" className="btn btn-link text-start text-decoration-none flex-grow-1 px-0" onClick={() => events.onOpen(item)} aria-label={`${item.subject}${!item.readAt && !item.withdrawnAt ? ', unread' : ''}`}>
              <span className="d-block">{item.subject}</span><span className="d-block small text-body-secondary">{typeText(item)}</span><span className="d-block small text-body-secondary">{new Date(item.occurredAt).toLocaleString()}</span>
            </button>
            {!item.readAt ? <button type="button" className="btn btn-link btn-sm align-self-center" onClick={() => events.onMarkRead(item.id)}>Mark as read</button> : null}
            {item.withdrawnAt ? <span className="small text-body-secondary align-self-center">Withdrawn</span> : null}
          </div>
        ))}
      </div>
      {state.nextCursor ? <button type="button" className="btn btn-outline-secondary mt-3" onClick={events.onLoadMore} disabled={state.loadingMore}>{state.loadingMore ? 'Loading…' : 'Load more'}</button> : null}
    </main>
  );
}
