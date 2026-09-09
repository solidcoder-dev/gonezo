import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NotificationSettingsState } from '../application/notificationSettings.types';
import { NotificationSettingsPageView } from './NotificationSettingsPageView';

function renderSubject(permission: NotificationSettingsState['permission']) {
  const events = {
    onBack: vi.fn(),
    onRequestPermission: vi.fn(),
    onOpenSettings: vi.fn(),
    onRetry: vi.fn(),
  };
  render(<NotificationSettingsPageView state={{ permission, loading: false, error: null }} events={events} />);
  return events;
}

describe('NotificationSettingsPageView', () => {
  it('shows granted and opens device settings', () => {
    const events = renderSubject('granted');

    expect(screen.getByText('Enabled')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open device settings' }));
    expect(events.onOpenSettings).toHaveBeenCalledOnce();
  });

  it('shows denied and offers the permission actions', () => {
    const events = renderSubject('denied');

    expect(screen.getByText('Off')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enable notifications' }));
    expect(events.onRequestPermission).toHaveBeenCalledOnce();
  });

  it('shows blocked and opens device settings', () => {
    const events = renderSubject('channel_blocked');

    expect(screen.getByText('Blocked')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open device settings' }));
    expect(events.onOpenSettings).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Enable notifications' })).not.toBeInTheDocument();
  });

  it('shows unsupported without invalid actions', () => {
    renderSubject('unsupported');

    expect(screen.getByText('Not available')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enable notifications' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open device settings' })).not.toBeInTheDocument();
  });
});
