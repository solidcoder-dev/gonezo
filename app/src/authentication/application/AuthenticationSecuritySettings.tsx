import { useEffect, useState, type FormEvent } from 'react';
import type { AuthenticationUseCases } from './authentication.port';
import { useAuthenticationSession } from './authenticationSessionContext';
import { AuthenticationSecuritySettingsView } from '../ui/AuthenticationSecuritySettingsView';

export function AuthenticationSecuritySettings({ authentication }: { authentication: AuthenticationUseCases }) {
  const session = useAuthenticationSession();
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void Promise.all([authentication.isDeviceUnlockAvailable(), authentication.isDeviceUnlockEnabled()])
      .then(([isAvailable, isEnabled]) => { setAvailable(isAvailable); setEnabled(isEnabled); })
      .catch(() => setError('Device unlock settings are unavailable'));
  }, [authentication]);

  async function enable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      await authentication.enableDeviceUnlock(password);
      setPassword('');
      setEnabled(true);
    } catch (cause) {
      setError(cause instanceof Error && cause.message === 'Device authentication is unavailable'
        ? cause.message
        : 'Invalid credentials');
    }
  }

  async function disable() {
    setError('');
    try {
      await authentication.disableDeviceUnlock();
      setEnabled(false);
    } catch {
      setError('Device unlock could not be disabled');
    }
  }

  async function logout() {
    setError('');
    try {
      await session.logout();
    } catch {
      setError('Secure session could not be cleared. Try again.');
    }
  }

  return <AuthenticationSecuritySettingsView enabled={enabled} available={available} password={password} error={error} onPasswordChange={setPassword} onEnable={(event) => { void enable(event); }} onDisable={() => { void disable(); }} onLogout={() => { void logout(); }} />;
}
