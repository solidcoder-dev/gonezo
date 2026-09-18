import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { AuthenticationUseCases } from './authentication.port';
import { AuthenticationGateView } from '../ui/AuthenticationGateView';
import { AuthenticationSessionProvider } from './authenticationSession';

type AuthenticationGateProps = {
  required: { authentication: AuthenticationUseCases };
  children: ReactNode;
};

export function AuthenticationGate({ required, children }: AuthenticationGateProps) {
  const [state, setState] = useState<'loading' | 'setup' | 'locked' | { status: 'authenticated'; userId: string }>('loading');
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
    void required.authentication.getAuthenticationState().then(async (authState) => {
      if (!active) return;
      if (authState.status === 'authenticated') {
        setState({ status: 'authenticated', userId: authState.userId });
        return;
      }
      const exists = await required.authentication.hasCredentials();
      if (active) {
        setState(exists ? 'locked' : 'setup');
      }
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
  }, [refreshDeviceUnlock, required.authentication]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = event.currentTarget.elements.namedItem('username');
    const password = event.currentTarget.elements.namedItem('password');
    const confirmation = event.currentTarget.elements.namedItem('confirmPassword');
    if (!(username instanceof HTMLInputElement) || !(password instanceof HTMLInputElement)) return;
      if (state === 'setup' && (!(confirmation instanceof HTMLInputElement) || confirmation.value !== password.value)) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (state === 'setup') await required.authentication.setupCredentials(username.value, password.value);
      else await required.authentication.loginWithPassword(username.value, password.value);
      const authState = await required.authentication.getAuthenticationState();
      if (authState.status !== 'authenticated') throw new Error('Authentication session could not be established');
      setState({ status: 'authenticated', userId: authState.userId });
      await refreshDeviceUnlock();
    } catch (cause) {
      setError(state === 'locked' ? 'Invalid credentials' : cause instanceof Error ? cause.message : 'Account could not be created');
    } finally {
      setSubmitting(false);
    }
  }

  async function unlockWithDevice() {
    setError('');
    try {
      await required.authentication.unlockWithDevice();
      const authState = await required.authentication.getAuthenticationState();
      if (authState.status !== 'authenticated') throw new Error('Authentication session could not be established');
      setState({ status: 'authenticated', userId: authState.userId });
    } catch (cause) {
      const code = typeof cause === 'object' && cause !== null && 'code' in cause ? cause.code : undefined;
      setError(code === 'DEVICE_AUTHENTICATION_UNAVAILABLE'
        ? 'Device authentication is unavailable. Use your password.'
        : 'Device authentication was cancelled or failed. Use your password.');
    }
  }

  async function logout(): Promise<void> {
    await required.authentication.logout();
    setError('');
    setState('locked');
  }

  if (typeof state === 'object') {
    return <AuthenticationSessionProvider session={{ userId: state.userId, logout }}>{children}</AuthenticationSessionProvider>;
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
    />
  );
}
