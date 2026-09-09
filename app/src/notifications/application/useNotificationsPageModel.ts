import { useCallback, useEffect, useState } from 'react';
import type { NotificationItem, NotificationsFilter, NotificationsPort } from './notifications.port';
import type { NotificationsPageState } from './notificationsPage.types';
export type { NotificationsPageState } from './notificationsPage.types';

export function useNotificationsPageModel(port: NotificationsPort): {
  state: NotificationsPageState;
  actions: {
    setFilter: (filter: NotificationsFilter) => void;
    loadMore: () => void;
    markRead: (id: string) => void;
    markAllRead: () => void;
    retry: () => void;
  };
} {
  const [filter, setFilter] = useState<NotificationsFilter>('all');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [snapshotCursor, setSnapshotCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const load = useCallback(async (append: boolean, beforeCursor?: string) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const [list, count] = await Promise.all([
        port.notificationsList({ filter, beforeCursor: append ? beforeCursor : undefined, limit: 30 }),
        port.notificationsCountUnread(),
      ]);
      setItems((previous) => append ? [...previous, ...list.items] : list.items);
      setNextCursor(list.nextCursor);
      setSnapshotCursor((previous) => append ? previous : list.snapshotCursor);
      setUnreadCount(count);
    } catch {
      setError('Unable to load notifications');
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, [filter, port]);

  useEffect(() => { void load(false); }, [filter, refreshToken, load]);
  useEffect(() => {
    let active = true;
    let remove: (() => void) | undefined;
    void port.addChangeListener(() => { if (active) setRefreshToken((value) => value + 1); }).then((cleanup) => { remove = cleanup; });
    return () => { active = false; remove?.(); };
  }, [port]);

  const run = (action: () => Promise<unknown>) => { void action().then(() => setRefreshToken((value) => value + 1)).catch(() => setError('Unable to update notifications')); };
  return {
    state: { filter, items, unreadCount, nextCursor, snapshotCursor, loading, loadingMore, error },
    actions: {
      setFilter,
      loadMore: () => { if (nextCursor && !loadingMore) void load(true, nextCursor); },
      markRead: (id) => run(() => port.notificationsMarkRead(id)),
      markAllRead: () => { if (snapshotCursor) run(() => port.notificationsMarkAllRead(snapshotCursor)); },
      retry: () => setRefreshToken((value) => value + 1),
    },
  };
}
