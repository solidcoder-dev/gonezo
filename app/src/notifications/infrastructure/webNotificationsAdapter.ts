import type {
  NotificationCommandResult,
  NotificationsListInput,
  NotificationsListResult,
  NotificationsPort,
} from '../application/notifications.port';
import type { NotificationSettingsLifecyclePort } from '../application/notificationSettingsLifecycle.port';

export class WebNotificationsAdapter implements NotificationsPort, NotificationSettingsLifecyclePort {
  private readonly clock: () => string;
  private items = new Map<string, Notification>();
  private sequence = 0;
  private readonly listeners = new Set<() => void>();

  constructor(options: { clock?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date().toISOString());
  }

  notificationsList(input: NotificationsListInput): Promise<NotificationsListResult> {
    const items = [...this.items.values()]
      .filter((item) => input.filter === 'all' || (item.readAt === null && item.withdrawnAt === null))
      .sort((left, right) => right.sequence - left.sequence);
    const before = input.beforeCursor ? Number(input.beforeCursor) : Number.POSITIVE_INFINITY;
    const limit = input.limit ?? 30;
    const page = items.filter((item) => item.sequence < before).slice(0, limit);
    const next = page.length === limit ? String(page.at(-1)?.sequence) : null;
    return Promise.resolve({
      items: page.map((value) => {
        return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'sequence')) as Omit<Notification, 'sequence'>;
      }),
      nextCursor: next,
      snapshotCursor: this.sequence ? String(this.sequence) : null,
    });
  }

  notificationsCountUnread(): Promise<number> {
    return Promise.resolve([...this.items.values()].filter((item) => item.readAt === null && item.withdrawnAt === null).length);
  }

  notificationsMarkRead(id: string): Promise<NotificationCommandResult> {
    const item = this.items.get(id);
    if (!item) return Promise.resolve({ found: false });
    if (!item.readAt) item.readAt = this.clock();
    return Promise.resolve({ found: true, item: { ...item } });
  }

  notificationsMarkAllRead(throughCursor: string): Promise<{ updated: number }> {
    const through = Number(throughCursor);
    let updated = 0;
    this.items.forEach((item) => {
      if (item.sequence <= through && item.readAt === null) {
        item.readAt = this.clock();
        updated += 1;
      }
    });
    return Promise.resolve({ updated });
  }

  getPermissionState() { return Promise.resolve<'unsupported'>('unsupported'); }
  requestPermission() { return Promise.resolve(); }
  openSettings() { return Promise.resolve(); }
  getCapabilities() { return { inbox: true, systemNotifications: false }; }

  async addChangeListener(listener: () => void): Promise<() => void> {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  addResumeListener(): Promise<() => void> {
    return Promise.resolve(() => undefined);
  }

  reset() {
    this.items.clear();
    this.sequence = 0;
  }

  addForDevelopment(item: Omit<Notification, 'sequence'>) {
    this.sequence += 1;
    this.items.set(item.id, { ...item, sequence: this.sequence });
    this.listeners.forEach((listener) => listener());
  }
}

type Notification = {
  sequence: number;
  id: string;
  type: string;
  sourceType: string;
  sourceId: string;
  subject: string;
  errorCode?: string;
  occurredAt: string;
  createdAt: string;
  readAt: string | null;
  withdrawnAt: string | null;
};
