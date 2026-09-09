import { useCallback, useEffect, useState } from 'react';
import type { NotificationSettingsPort } from './notifications.port';
import type { NotificationSettingsState } from './notificationSettings.types';
import type { NotificationSettingsLifecyclePort } from './notificationSettingsLifecycle.port';

export function useNotificationSettingsModel(port: NotificationSettingsPort, lifecycle: NotificationSettingsLifecyclePort): {
  state: NotificationSettingsState;
  actions: {
    requestPermission: () => void;
    openSettings: () => void;
    retry: () => void;
  };
} {
  const [permission, setPermission] = useState<NotificationSettingsState['permission']>('unsupported');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setPermission(await port.getPermissionState());
    } catch {
      setError('Unable to load notification settings');
    } finally {
      setLoading(false);
    }
  }, [port]);

  useEffect(() => { void refresh(); }, [refresh, refreshToken]);

  useEffect(() => {
    let active = true;
    let remove: (() => void) | undefined;
    void lifecycle.addResumeListener(() => {
      if (active) setRefreshToken((value) => value + 1);
    }).then((cleanup) => { remove = cleanup; });
    return () => { active = false; remove?.(); };
  }, [lifecycle]);

  const run = (action: () => Promise<void>) => {
    setLoading(true);
    void action().then(() => setRefreshToken((value) => value + 1)).catch(() => {
      setError('Unable to update notification settings');
      setLoading(false);
    });
  };

  return {
    state: { permission, loading, error },
    actions: {
      requestPermission: () => run(port.requestPermission),
      openSettings: () => run(port.openSettings),
      retry: () => { setLoading(true); setRefreshToken((value) => value + 1); },
    },
  };
}
