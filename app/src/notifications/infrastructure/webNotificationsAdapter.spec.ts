import { describe, expect, it } from 'vitest';
import { WebNotificationsAdapter } from './webNotificationsAdapter';

const item = (id: string) => ({
  id,
  type: 'scheduled_processing_failed',
  sourceType: 'scheduled',
  sourceId: 'scheduled-1',
  subject: 'Scheduled movement',
  errorCode: 'PROCESSING_FAILED',
  occurredAt: '2026-06-10T10:00:00.000Z',
  createdAt: '2026-06-10T10:00:00.000Z',
  readAt: null,
  withdrawnAt: null,
});

describe('WebNotificationsAdapter', () => {
  it('is resettable and preserves the first read timestamp', async () => {
    const adapter = new WebNotificationsAdapter({ clock: () => '2026-06-10T11:00:00.000Z' });
    adapter.addForDevelopment(item('one'));

    await adapter.notificationsMarkRead('one');
    const repeated = await adapter.notificationsMarkRead('one');

    expect(repeated.item?.readAt).toBe('2026-06-10T11:00:00.000Z');
    adapter.reset();
    expect(await adapter.notificationsCountUnread()).toBe(0);
  });

  it('returns stable string cursors and explicit unsupported system capability', async () => {
    const adapter = new WebNotificationsAdapter();
    adapter.addForDevelopment(item('one'));
    adapter.addForDevelopment(item('two'));

    const page = await adapter.notificationsList({ filter: 'all', limit: 1 });

    expect(page.nextCursor).toBe('2');
    expect(page.snapshotCursor).toBe('2');
    expect(adapter.getCapabilities()).toEqual({ inbox: true, systemNotifications: false });
    expect(await adapter.notificationsMarkRead('missing')).toEqual({ found: false });
  });
});
