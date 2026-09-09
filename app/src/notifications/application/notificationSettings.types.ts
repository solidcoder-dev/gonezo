import type { NotificationPermissionState } from './notifications.port';

export type NotificationSettingsState = {
  permission: NotificationPermissionState;
  loading: boolean;
  error: string | null;
};
