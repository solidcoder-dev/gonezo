import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthenticationGate } from './AuthenticationGate';
import type { AuthenticationService } from './authenticationService';

function createAuthentication(exists: boolean) {
  let authenticated = false;
  let enabled = false;
  const authentication = {
    getAuthenticationState: () => ({ status: authenticated ? 'authenticated' : 'anonymous' } as const),
    hasCredentials: async () => exists,
    isDeviceUnlockAvailable: vi.fn(async () => true),
    isDeviceUnlockEnabled: vi.fn(async () => enabled),
    setupCredentials: vi.fn(async () => { authenticated = true; }),
    loginWithPassword: vi.fn(async () => { authenticated = true; }),
    unlockWithDevice: vi.fn(async () => { authenticated = true; }),
    enableDeviceUnlock: vi.fn(async () => { enabled = true; }),
    disableDeviceUnlock: vi.fn(async () => { enabled = false; }),
    logout: vi.fn(() => { authenticated = false; }),
  } as unknown as AuthenticationService;
  return authentication;
}

describe('AuthenticationGate', () => {
  it('sets up the first local credentials before showing Gonezo', async () => {
    const authentication = createAuthentication(false);
    render(<AuthenticationGate required={{ authentication }}><p>Gonezo home</p></AuthenticationGate>);

    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'long-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create credentials' }));

    await screen.findByText('Gonezo home');
    expect(authentication.setupCredentials).toHaveBeenCalledWith('alice', 'long-password');
  });

  it('shows a generic password error and keeps the gate locked', async () => {
    const authentication = createAuthentication(true);
    vi.mocked(authentication.loginWithPassword).mockRejectedValue(new Error('Invalid credentials'));
    render(<AuthenticationGate required={{ authentication }}><p>Gonezo home</p></AuthenticationGate>);

    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(screen.queryByText('Gonezo home')).not.toBeInTheDocument();
  });

  it('allows device unlock and falls back to password after cancellation', async () => {
    const authentication = createAuthentication(true);
    vi.mocked(authentication.isDeviceUnlockEnabled).mockResolvedValue(true);
    vi.mocked(authentication.unlockWithDevice).mockRejectedValue(new Error('cancelled'));
    render(<AuthenticationGate required={{ authentication }}><p>Gonezo home</p></AuthenticationGate>);

    fireEvent.click(await screen.findByRole('button', { name: 'Unlock with device' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Use your password');
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeInTheDocument();
    expect(screen.queryByText('Gonezo home')).not.toBeInTheDocument();
  });

  it('enables device unlock only after password login and can lock the session', async () => {
    const authentication = createAuthentication(true);
    render(<AuthenticationGate required={{ authentication }}><p>Gonezo home</p></AuthenticationGate>);

    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'long-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    await screen.findByText('Gonezo home');
    fireEvent.click(screen.getByRole('button', { name: 'Enable device unlock' }));
    await waitFor(() => expect(authentication.enableDeviceUnlock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Lock Gonezo' }));
    expect(await screen.findByRole('heading', { name: 'Unlock Gonezo' })).toBeInTheDocument();
  });
});
