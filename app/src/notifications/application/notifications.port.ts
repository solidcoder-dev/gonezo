import type { PluginListenerHandle } from '@capacitor/core';

export type NotificationsFilter = 'all' | 'unread';
export type NotificationPermissionState = 'granted' | 'denied' | 'channel_blocked' | 'unsupported';

export type NotificationItem = {
  id: string;
  type: string;
  sourceType: string;
  sourceId: string;
  subject: string;
  errorCode?: string;
  occurredAt: string;
  createdAt: string;
  readAt: string | null;
  withdrawnAt: string | null;
};

export type NotificationsListInput = {
  filter: NotificationsFilter;
  beforeCursor?: string;
  limit?: number;
};

export type NotificationsListResult = {
  items: NotificationItem[];
  nextCursor: string | null;
  snapshotCursor: string | null;
};

export type NotificationCommandResult = {
  found: boolean;
  item?: NotificationItem;
};

export type NotificationsCapabilities = {
  inbox: boolean;
  systemNotifications: boolean;
};

export type NotificationsPort = {
  notificationsList(input: NotificationsListInput): Promise<NotificationsListResult>;
  notificationsCountUnread(): Promise<number>;
  notificationsMarkRead(id: string): Promise<NotificationCommandResult>;
  notificationsMarkAllRead(throughCursor: string): Promise<{ updated: number }>;
  getPermissionState(): Promise<NotificationPermissionState>;
  requestPermission(): Promise<void>;
  openSettings(): Promise<void>;
  getCapabilities(): NotificationsCapabilities;
  addChangeListener(listener: () => void): Promise<() => void>;
};

export type NotificationsPluginContract = {
  notificationsList(input: NotificationsListInput): Promise<NotificationsListResult>;
  notificationsCountUnread(): Promise<{ count: number }>;
  notificationsMarkRead(input: { id: string }): Promise<NotificationCommandResult>;
  notificationsMarkAllRead(input: { throughCursor: string }): Promise<{ updated: number }>;
  notificationsGetPermissionState(): Promise<{ state: NotificationPermissionState }>;
  notificationsRequestPermission(): Promise<void>;
  notificationsOpenSettings(): Promise<void>;
  addListener(eventName: 'notificationsChanged', listener: () => void): Promise<PluginListenerHandle>;
};
