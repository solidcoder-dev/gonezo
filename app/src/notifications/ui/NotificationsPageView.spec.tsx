import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NotificationsPageState } from '../application/useNotificationsPageModel';
import { NotificationsPageView } from './NotificationsPageView';

const state: NotificationsPageState = {
  filter: 'all',
  items: [{
    id: 'notification-1', type: 'scheduled_processing_failed', sourceType: 'scheduled', sourceId: 'scheduled-1',
    subject: 'Scheduled movement', errorCode: 'PROCESSING_FAILED', occurredAt: '2026-06-10T10:00:00Z',
    createdAt: '2026-06-10T10:00:00Z', readAt: null, withdrawnAt: null,
  }],
  unreadCount: 1,
  nextCursor: 'sequence:1',
  snapshotCursor: 'sequence:1',
  loading: false,
  loadingMore: false,
  error: null,
  permission: 'denied',
};

describe('NotificationsPageView', () => {
  it('supports filtering, reading, paging, retry and permission action without nested buttons', () => {
    const events = {
      onBack: vi.fn(), onFilterChanged: vi.fn(), onLoadMore: vi.fn(), onMarkRead: vi.fn(), onOpen: vi.fn(),
      onMarkAllRead: vi.fn(), onRequestPermission: vi.fn(), onOpenSettings: vi.fn(), onRetry: vi.fn(),
    };
    render(<NotificationsPageView state={state} events={events} />);

    fireEvent.click(screen.getByRole('button', { name: 'Unread' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark as read' }));
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enable notifications' }));

    expect(events.onFilterChanged).toHaveBeenCalledWith('unread');
    expect(events.onMarkRead).toHaveBeenCalledWith('notification-1');
    expect(events.onLoadMore).toHaveBeenCalledOnce();
    expect(events.onRequestPermission).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Scheduled movement, unread' })).toBeInTheDocument();
  });
});
