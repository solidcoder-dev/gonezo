import { Capacitor } from '@capacitor/core';
import { CorePlugin } from '../../core/infrastructure/corePlugin';
import type { NotificationPermissionState, NotificationsPort } from '../application/notifications.port';
import { WebNotificationsAdapter } from './webNotificationsAdapter';

class AndroidNotificationsAdapter implements NotificationsPort {
  notificationsList = (input: Parameters<typeof CorePlugin.notificationsList>[0]) => CorePlugin.notificationsList(input);
  notificationsCountUnread = async () => (await CorePlugin.notificationsCountUnread()).count;
  notificationsMarkRead = (id: string) => CorePlugin.notificationsMarkRead({ id });
  notificationsMarkAllRead = (throughCursor: string) => CorePlugin.notificationsMarkAllRead({ throughCursor });
  getPermissionState = async (): Promise<NotificationPermissionState> => (await CorePlugin.notificationsGetPermissionState()).state;
  requestPermission = () => CorePlugin.notificationsRequestPermission();
  openSettings = () => CorePlugin.notificationsOpenSettings();
  getCapabilities = () => ({ inbox: true, systemNotifications: true });
  addChangeListener = async (listener: () => void) => (await CorePlugin.addListener('notificationsChanged', listener)).remove;
}

class UnsupportedNotificationsAdapter extends WebNotificationsAdapter {
  override getCapabilities() { return { inbox: false, systemNotifications: false }; }
  override getPermissionState() { return Promise.resolve<'unsupported'>('unsupported'); }
}

export function createNotificationsAdapter(): NotificationsPort {
  if (Capacitor.getPlatform() === 'android') return new AndroidNotificationsAdapter();
  if (Capacitor.getPlatform() === 'ios') return new UnsupportedNotificationsAdapter();
  return new WebNotificationsAdapter();
}
