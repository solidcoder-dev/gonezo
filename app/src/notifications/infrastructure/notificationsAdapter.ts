import { Capacitor } from '@capacitor/core';
import { CorePlugin } from '../../core/infrastructure/corePlugin';
import type { NotificationPermissionState, NotificationsPort } from '../application/notifications.port';
import type { NotificationSettingsLifecyclePort } from '../application/notificationSettingsLifecycle.port';
import { App as CapacitorApp } from '@capacitor/app';
import { WebNotificationsAdapter } from './webNotificationsAdapter';

class AndroidNotificationsAdapter implements NotificationsPort, NotificationSettingsLifecyclePort {
  notificationsList = (input: Parameters<typeof CorePlugin.notificationsList>[0]) => CorePlugin.notificationsList(input);
  notificationsCountUnread = async () => (await CorePlugin.notificationsCountUnread()).count;
  notificationsMarkRead = (id: string) => CorePlugin.notificationsMarkRead({ id });
  notificationsMarkAllRead = (throughCursor: string) => CorePlugin.notificationsMarkAllRead({ throughCursor });
  getPermissionState = async (): Promise<NotificationPermissionState> => (await CorePlugin.notificationsGetPermissionState()).state;
  requestPermission = () => CorePlugin.notificationsRequestPermission();
  openSettings = () => CorePlugin.notificationsOpenSettings();
  getCapabilities = () => ({ inbox: true, systemNotifications: true });
  addChangeListener = async (listener: () => void) => (await CorePlugin.addListener('notificationsChanged', listener)).remove;
  addResumeListener = async (listener: () => void) => (await CapacitorApp.addListener('resume', listener)).remove;
}

class UnsupportedNotificationsAdapter extends WebNotificationsAdapter implements NotificationSettingsLifecyclePort {
  override getCapabilities() { return { inbox: false, systemNotifications: false }; }
  override getPermissionState() { return Promise.resolve<'unsupported'>('unsupported'); }
}

export function createNotificationsAdapter(): NotificationsPort & NotificationSettingsLifecyclePort {
  if (Capacitor.getPlatform() === 'android') return new AndroidNotificationsAdapter();
  if (Capacitor.getPlatform() === 'ios') return new UnsupportedNotificationsAdapter();
  return new WebNotificationsAdapter();
}
