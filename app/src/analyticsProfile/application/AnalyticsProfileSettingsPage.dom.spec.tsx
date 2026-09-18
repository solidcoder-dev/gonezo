import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthenticationSessionProvider } from '../../authentication/application/authenticationSession';
import type { AnalyticsProfile, AnalyticsProfileDraft } from '../domain/analyticsProfile';
import type { AnalyticsProfilePort } from './analyticsProfile.port';
import { AnalyticsProfileSettingsPage } from './AnalyticsProfileSettingsPage';

class EditableProfilePort implements AnalyticsProfilePort {
  profile: AnalyticsProfile = {
    userId: 'user-1', birthYear: 1995, sex: 'female', countryCode: 'ES', regionCode: 'ES-CN',
    completedAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  };
  async get(userId: string) { return this.profile.userId === userId ? this.profile : null; }
  async save(draft: AnalyticsProfileDraft) {
    this.profile = { ...draft, completedAt: this.profile.completedAt, updatedAt: new Date().toISOString() };
    return this.profile;
  }
}

describe('AnalyticsProfileSettingsPage', () => {
  it('saves edited profile values for the authenticated user', async () => {
    const port = new EditableProfilePort();
    render(<MemoryRouter initialEntries={['/profile/analytics-profile']}><AuthenticationSessionProvider session={{ userId: 'user-1', logout: async () => undefined }}><Routes>
      <Route path="/profile/analytics-profile" element={<AnalyticsProfileSettingsPage port={port} />} />
      <Route path="/profile" element={<p>Profile page</p>} />
    </Routes></AuthenticationSessionProvider></MemoryRouter>);

    fireEvent.change(await screen.findByLabelText('Year of birth'), { target: { value: '1990' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Profile page')).toBeInTheDocument();
    await expect(port.get('user-1')).resolves.toMatchObject({ birthYear: 1990, sex: 'female', countryCode: 'ES', regionCode: 'ES-CN' });
  });
});
