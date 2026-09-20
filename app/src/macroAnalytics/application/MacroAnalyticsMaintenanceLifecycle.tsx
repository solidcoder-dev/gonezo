import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useAuthenticationSession } from '../../authentication/application/authenticationSessionContext';

export function MacroAnalyticsMaintenanceLifecycle({ runMaintenance }: { runMaintenance(userId: string): Promise<void> }) {
  const { userId } = useAuthenticationSession();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const run = () => { void runMaintenance(userId).catch(() => {}); };
    run();
    let active = true;
    let removeListener: (() => void) | undefined;
    void CapacitorApp.addListener('resume', run).then((listener) => {
      if (active) removeListener = () => { void listener.remove(); };
      else void listener.remove();
    }).catch(() => {});
    return () => { active = false; removeListener?.(); };
  }, [runMaintenance, userId]);

  return null;
}
