import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { AuthenticationUseCases } from './authentication.port';
import { AuthenticationGateView } from '../ui/AuthenticationGateView';

type AuthenticationGateProps = {
  required: { authentication: AuthenticationUseCases };
  children: ReactNode;
};

export function AuthenticationGate({ required, children }: AuthenticationGateProps) {
  const [state, setState] = useState<'loading' | 'setup' | 'locked' | 'authenticated'>(
    required.authentication.getAuthenticationState().status === 'authenticated' ? 'authenticated' : 'loading',
  );
  const [deviceUnlockAvailable, setDeviceUnlockAvailable] = useState(false);
  const [deviceUnlockEnabled, setDeviceUnlockEnabled] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refreshDeviceUnlock = useCallback(async () => {
    const [available, enabled] = await Promise.all([
      required.authentication.isDeviceUnlockAvailable(),
      required.authentication.isDeviceUnlockEnabled(),
    ]);
    setDeviceUnlockAvailable(available);
    setDeviceUnlockEnabled(enabled);
  }, [required.authentication]);

  useEffect(() => {
    let active = true;
    void required.authentication.hasCredentials().then((exists) => {
      if (active && state !== 'authenticated') setState(exists ? 'locked' : 'setup');
    }).catch(() => {
      if (active) setError('Secure authentication is unavailable. Restart Gonezo and try again.');
    });
    void refreshDeviceUnlock().catch(() => {
      if (active) {
        setDeviceUnlockAvailable(false);
        setDeviceUnlockEnabled(false);
      }
    });
    return () => { active = false; };
  }, [refreshDeviceUnlock, required.authentication, state]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = event.currentTarget.elements.namedItem('username');
    const password = event.currentTarget.elements.namedItem('password');
    if (!(username instanceof HTMLInputElement) || !(password instanceof HTMLInputElement)) return;
    setSubmitting(true);
    setError('');
    try {
      if (state === 'setup') await required.authentication.setupCredentials(username.value, password.value);
      else await required.authentication.loginWithPassword(username.value, password.value);
      setState('authenticated');
      await refreshDeviceUnlock();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function unlockWithDevice() {
    setError('');
    try {
      await required.authentication.unlockWithDevice();
      setState('authenticated');
    } catch {
      setError('Device authentication was cancelled or failed. Use your password.');
    }
  }

  async function changeDeviceUnlock(enable: boolean) {
    setError('');
    try {
      if (enable) await required.authentication.enableDeviceUnlock();
      else await required.authentication.disableDeviceUnlock();
      await refreshDeviceUnlock();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Device unlock could not be changed');
    }
  }

  return (
    <AuthenticationGateView
      state={state}
      deviceUnlockAvailable={deviceUnlockAvailable}
      deviceUnlockEnabled={deviceUnlockEnabled}
      submitting={submitting}
      error={error}
      onSubmit={(event) => { void submit(event); }}
      onDeviceUnlock={() => { void unlockWithDevice(); }}
      onEnableDeviceUnlock={() => { void changeDeviceUnlock(true); }}
      onDisableDeviceUnlock={() => { void changeDeviceUnlock(false); }}
      onLogout={() => { required.authentication.logout(); setState('locked'); }}
    >
      {children}
    </AuthenticationGateView>
  );
}
