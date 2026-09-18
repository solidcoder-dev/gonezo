import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthenticationGate } from './AuthenticationGate';
import type { AuthenticationUseCases } from './authentication.port';
import { useAuthenticationSession } from './authenticationSessionContext';

function LogoutControl() {
  const session = useAuthenticationSession();
  return <button onClick={() => { void session.logout(); }}>Log out</button>;
}

function createAuthentication(exists: boolean, startsAuthenticated = false) {
  let authenticated = startsAuthenticated;
  let credentialsExist = exists;
  let enabled = false;
  const authentication = {
    getAuthenticationState: async () => ({ status: authenticated ? 'authenticated' : 'unauthenticated' } as const),
    hasCredentials: async () => credentialsExist,
    isDeviceUnlockAvailable: vi.fn(async () => true),
    isDeviceUnlockEnabled: vi.fn(async () => enabled),
    setupCredentials: vi.fn(async () => { authenticated = true; credentialsExist = true; }),
    loginWithPassword: vi.fn(async () => { authenticated = true; }),
    unlockWithDevice: vi.fn(async () => { authenticated = true; }),
    enableDeviceUnlock: vi.fn(async () => { enabled = true; }),
    disableDeviceUnlock: vi.fn(async () => { enabled = false; }),
    logout: vi.fn(async () => { authenticated = false; }),
  } as AuthenticationUseCases;
  return authentication;
}

describe('AuthenticationGate', () => {
  it('creates credentials and authenticates the first local user before showing Gonezo', async () => {
    const authentication = createAuthentication(false);
    render(<AuthenticationGate required={{ authentication }}><p>Gonezo home</p></AuthenticationGate>);

    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'long-password' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'long-password' } });
    fireEvent.submit(screen.getByLabelText('Password').closest('form')!);

    await screen.findByText('Gonezo home');
    expect(authentication.setupCredentials).toHaveBeenCalledWith('alice', 'long-password');
    expect(screen.queryByLabelText('Confirm password')).not.toBeInTheDocument();
  });

  it('shows a generic password error and keeps the gate locked', async () => {
    const authentication = createAuthentication(true);
    vi.mocked(authentication.loginWithPassword).mockRejectedValue(new Error('Invalid credentials'));
    render(<AuthenticationGate required={{ authentication }}><p>Gonezo home</p></AuthenticationGate>);

    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
    fireEvent.submit(screen.getByLabelText('Password').closest('form')!);

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(screen.queryByText('Gonezo home')).not.toBeInTheDocument();
  });

  it('signs in and returns to Gonezo home', async () => {
    const authentication = createAuthentication(true);
    render(<AuthenticationGate required={{ authentication }}><p>Gonezo home</p></AuthenticationGate>);

    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'right-password' } });
    fireEvent.submit(screen.getByLabelText('Password').closest('form')!);

    await screen.findByText('Gonezo home');
    expect(authentication.loginWithPassword).toHaveBeenCalledWith('alice', 'right-password');
  });

  it('restores an existing authenticated session on application startup', async () => {
    const authentication = createAuthentication(true, true);
    render(<AuthenticationGate required={{ authentication }}><p>Gonezo home</p></AuthenticationGate>);

    expect(await screen.findByText('Gonezo home')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Authentication' })).not.toBeInTheDocument();
  });

  it('allows device unlock and falls back to password after cancellation', async () => {
    const authentication = createAuthentication(true);
    vi.mocked(authentication.isDeviceUnlockEnabled).mockResolvedValue(true);
    vi.mocked(authentication.unlockWithDevice).mockRejectedValue(new Error('cancelled'));
    render(<AuthenticationGate required={{ authentication }}><p>Gonezo home</p></AuthenticationGate>);

    fireEvent.click(await screen.findByRole('button', { name: 'Unlock with device' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Use your password');
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.queryByText('Gonezo home')).not.toBeInTheDocument();
  });

  it('explains when device authentication becomes unavailable', async () => {
    const authentication = createAuthentication(true);
    vi.mocked(authentication.isDeviceUnlockEnabled).mockResolvedValue(true);
    const unavailable = Object.assign(new Error('unavailable'), { code: 'DEVICE_AUTHENTICATION_UNAVAILABLE' });
    vi.mocked(authentication.unlockWithDevice).mockRejectedValue(unavailable);
    render(<AuthenticationGate required={{ authentication }}><p>Gonezo home</p></AuthenticationGate>);

    fireEvent.click(await screen.findByRole('button', { name: 'Unlock with device' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Device authentication is unavailable');
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('explains when enabled device authentication is unavailable before prompting', async () => {
    const authentication = createAuthentication(true);
    vi.mocked(authentication.isDeviceUnlockEnabled).mockResolvedValue(true);
    vi.mocked(authentication.isDeviceUnlockAvailable).mockResolvedValue(false);
    render(<AuthenticationGate required={{ authentication }}><p>Gonezo home</p></AuthenticationGate>);

    expect(await screen.findByText('Device authentication is unavailable. Sign in with your password.')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unlock with device' })).not.toBeInTheDocument();
  });

  it('opens Gonezo after successful device authentication', async () => {
    const authentication = createAuthentication(true);
    vi.mocked(authentication.isDeviceUnlockEnabled).mockResolvedValue(true);
    render(<AuthenticationGate required={{ authentication }}><p>Gonezo home</p></AuthenticationGate>);

    fireEvent.click(await screen.findByRole('button', { name: 'Unlock with device' }));

    await screen.findByText('Gonezo home');
    expect(authentication.unlockWithDevice).toHaveBeenCalledOnce();
  });

  it('offers sign-in after creating an account and logging out', async () => {
    const authentication = createAuthentication(false);
    render(<AuthenticationGate required={{ authentication }}><><p>Gonezo home</p><LogoutControl /></></AuthenticationGate>);

    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'long-password' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'long-password' } });
    fireEvent.submit(screen.getByLabelText('Password').closest('form')!);
    await screen.findByText('Gonezo home');

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument();
  });

  it('renders only application content after authentication', async () => {
    const authentication = createAuthentication(true);
    render(<AuthenticationGate required={{ authentication }}><p>Gonezo home</p></AuthenticationGate>);

    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'long-password' } });
    fireEvent.submit(screen.getByLabelText('Password').closest('form')!);
    await screen.findByText('Gonezo home');
    expect(screen.queryByRole('button', { name: 'Enable device unlock' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();
  });
});
