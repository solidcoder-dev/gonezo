import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthenticationGate } from './AuthenticationGate';
import { AuthenticationSecuritySettings } from './AuthenticationSecuritySettings';
import type { AuthenticationUseCases } from './authentication.port';

function makeAuthentication() {
  let enabled = false;
  let authenticated = true;
  const authentication = {
    getAuthenticationState: async () => ({ status: authenticated ? 'authenticated' : 'unauthenticated' } as const),
    hasCredentials: async () => true,
    isDeviceUnlockAvailable: async () => true,
    isDeviceUnlockEnabled: async () => enabled,
    enableDeviceUnlock: vi.fn(async (password: string) => { if (password === 'right-password') enabled = true; else throw new Error('Invalid credentials'); }),
    disableDeviceUnlock: vi.fn(async () => { enabled = false; }),
    logout: vi.fn(async () => { authenticated = false; }),
  } as unknown as AuthenticationUseCases;
  return authentication;
}

function renderSettings(authentication = makeAuthentication()) {
  render(<AuthenticationGate required={{ authentication }}><AuthenticationSecuritySettings authentication={authentication} /></AuthenticationGate>);
  return authentication;
}

describe('AuthenticationSecuritySettings', () => {
  it('requires the password before enabling device unlock', async () => {
    const authentication = renderSettings();
    fireEvent.change(await screen.findByLabelText('Password to enable device unlock'), { target: { value: 'right-password' } });
    fireEvent.submit(screen.getByLabelText('Password to enable device unlock').closest('form')!);
    await waitFor(() => expect(authentication.enableDeviceUnlock).toHaveBeenCalledWith('right-password'));
    expect(await screen.findByRole('button', { name: 'Disable device unlock' })).toBeInTheDocument();
  });

  it('can disable device unlock', async () => {
    const authentication = renderSettings();
    fireEvent.change(await screen.findByLabelText('Password to enable device unlock'), { target: { value: 'right-password' } });
    fireEvent.submit(screen.getByLabelText('Password to enable device unlock').closest('form')!);
    fireEvent.click(await screen.findByRole('button', { name: 'Disable device unlock' }));
    await waitFor(() => expect(authentication.disableDeviceUnlock).toHaveBeenCalledOnce());
  });

  it('logs out through the gate session contract', async () => {
    const authentication = renderSettings();
    fireEvent.click(await screen.findByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(authentication.logout).toHaveBeenCalledOnce());
    expect(await screen.findByRole('heading', { name: 'Authentication' })).toBeInTheDocument();
  });
});
