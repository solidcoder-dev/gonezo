import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthenticationSessionProvider } from '../../authentication/application/authenticationSession';
import type { AnalyticsProfile, AnalyticsProfileDraft } from '../domain/analyticsProfile';
import type { AnalyticsProfilePort } from './analyticsProfile.port';
import { RequiredOnboardingGate } from './RequiredOnboardingGate';
import { AuthenticationGate } from '../../authentication/application/AuthenticationGate';
import type { AuthenticationUseCases } from '../../authentication/application/authentication.port';

class MemoryProfilePort implements AnalyticsProfilePort {
  readonly profiles = new Map<string, AnalyticsProfile>();
  async get(userId: string) { return this.profiles.get(userId) ?? null; }
  async save(draft: AnalyticsProfileDraft) {
    const now = new Date().toISOString();
    const profile = { ...draft, completedAt: this.profiles.get(draft.userId)?.completedAt ?? now, updatedAt: now };
    this.profiles.set(draft.userId, profile);
    return profile;
  }
}

function renderGate(port: MemoryProfilePort, route = '/analytics') {
  return render(<MemoryRouter initialEntries={[route]}><AuthenticationSessionProvider session={{ userId: 'user-1', logout: vi.fn() }}>
    <RequiredOnboardingGate port={port}><Routes><Route path="/analytics" element={<p>Analytics workspace</p>} /><Route path="/home" element={<p>Home workspace</p>} /></Routes></RequiredOnboardingGate>
  </AuthenticationSessionProvider></MemoryRouter>);
}

const completeProfile: AnalyticsProfile = {
  userId: 'user-1', birthYear: 1995, sex: 'female', countryCode: 'ES', regionCode: 'ES-CN',
  completedAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('RequiredOnboardingGate', () => {
  it('moves a first credential setup directly into required onboarding', async () => {
    let authenticated = false;
    const authentication = {
      getAuthenticationState: async () => authenticated ? { status: 'authenticated', userId: 'user-1' } : { status: 'unauthenticated' },
      hasCredentials: async () => authenticated,
      setupCredentials: async () => { authenticated = true; },
      loginWithPassword: async () => { authenticated = true; },
      unlockWithDevice: async () => { authenticated = true; },
      enableDeviceUnlock: async () => undefined,
      disableDeviceUnlock: async () => undefined,
      isDeviceUnlockEnabled: async () => false,
      isDeviceUnlockAvailable: async () => false,
      logout: async () => { authenticated = false; },
    } as AuthenticationUseCases;
    const port = new MemoryProfilePort();
    render(<MemoryRouter><AuthenticationGate required={{ authentication }}><RequiredOnboardingGate port={port}><p>Home workspace</p></RequiredOnboardingGate></AuthenticationGate></MemoryRouter>);

    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'long-password' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'long-password' } });
    fireEvent.submit(screen.getByLabelText('Password').closest('form')!);

    expect(await screen.findByRole('progressbar', { name: 'Onboarding progress' })).toBeInTheDocument();
    expect(screen.queryByText('Home workspace')).not.toBeInTheDocument();
  });

  it('gates a direct analytics route until an authenticated user completes onboarding', async () => {
    const port = new MemoryProfilePort();
    renderGate(port);
    expect(await screen.findByRole('heading', { name: /Your money\./ })).toBeInTheDocument();
    expect(screen.queryByText('Analytics workspace')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Get started' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText('Year of birth'), { target: { value: '1995' } });
    fireEvent.change(screen.getByLabelText('Sex'), { target: { value: 'female' } });
    fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'ES' } });
    fireEvent.change(screen.getByLabelText('Region'), { target: { value: 'ES-CN' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start using Gonezo' }));

    expect(await screen.findByText('Analytics workspace')).toBeInTheDocument();
    await expect(port.get('user-1')).resolves.toMatchObject({ birthYear: 1995, sex: 'female', countryCode: 'ES', regionCode: 'ES-CN' });
  });

  it('fails closed and keeps the entered profile available after a save failure', async () => {
    const port = new MemoryProfilePort();
    vi.spyOn(port, 'save').mockRejectedValue(new Error('storage unavailable'));
    renderGate(port);
    fireEvent.click(await screen.findByRole('button', { name: 'Get started' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText('Year of birth'), { target: { value: '1995' } });
    fireEvent.change(screen.getByLabelText('Sex'), { target: { value: 'female' } });
    fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'ES' } });
    fireEvent.change(screen.getByLabelText('Region'), { target: { value: 'ES-CN' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start using Gonezo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Profile could not be saved');
    expect(screen.queryByText('Analytics workspace')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Year of birth')).toHaveValue(1995);
  });

  it('routes an existing authenticated user with no profile through onboarding', async () => {
    const port = new MemoryProfilePort();
    renderGate(port, '/home');
    expect(await screen.findByRole('heading', { name: /Your money\./ })).toBeInTheDocument();
    expect(screen.queryByText('Home workspace')).not.toBeInTheDocument();
  });

  it('renders the requested route for a complete profile and isolates profiles by user ID', async () => {
    const port = new MemoryProfilePort();
    await port.save(completeProfile);
    await port.save({ ...completeProfile, userId: 'user-2', countryCode: 'FR', regionCode: 'FR-IDF' });
    renderGate(port);
    expect(await screen.findByText('Analytics workspace')).toBeInTheDocument();
    await expect(port.get('user-1')).resolves.toMatchObject({ countryCode: 'ES', regionCode: 'ES-CN' });
  });

  it('does not remove a completed profile when its user logs out and signs back in', async () => {
    const port = new MemoryProfilePort();
    await port.save(completeProfile);
    const loggedOut = await port.get('user-1');
    const loggedBackIn = await port.get('user-1');
    expect(loggedOut).toEqual(loggedBackIn);
  });
});
