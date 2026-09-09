import type { NotificationItem, NotificationPermissionState, NotificationsFilter } from './notifications.port';

export type NotificationsPageState = {
  filter: NotificationsFilter;
  items: NotificationItem[];
  unreadCount: number | null;
  nextCursor: string | null;
  snapshotCursor: string | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  permission: NotificationPermissionState;
};
