import type { FinancialDataChangeObserver } from '../application/financialDataChangeObserver.port';
import { analyticsPeriodForInstant } from '../domain/analyticsPeriod';
import { NativeContributionRebuildQueueAdapter } from './NativeContributionRebuildQueueAdapter';
import { NativeMacroAnalyticsBackfillStateAdapter } from './NativeMacroAnalyticsBackfillStateAdapter';

export class NativeFinancialDataChangeObserver implements FinancialDataChangeObserver {
  private readonly queue = new NativeContributionRebuildQueueAdapter();
  private readonly backfillState = new NativeMacroAnalyticsBackfillStateAdapter();
  private readonly currentUserId: () => Promise<string | null>;
  private readonly runMaintenance: (userId: string) => Promise<void>;

  constructor(
    currentUserId: () => Promise<string | null>,
    runMaintenance: (userId: string) => Promise<void> = async () => {},
  ) {
    this.currentUserId = currentUserId;
    this.runMaintenance = runMaintenance;
  }

  async periodChanged(effectiveAt: string): Promise<void> {
    const userId = await this.currentUserId();
    if (!userId) return;
    await this.queue.enqueue(userId, analyticsPeriodForInstant(effectiveAt, Intl.DateTimeFormat().resolvedOptions().timeZone));
    this.scheduleMaintenance(userId);
  }

  async periodAndFollowingChanged(effectiveAt: string): Promise<void> {
    const userId = await this.currentUserId();
    if (!userId) return;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const changedPeriod = analyticsPeriodForInstant(effectiveAt, timeZone);
    const currentPeriod = analyticsPeriodForInstant(new Date().toISOString(), timeZone);
    await this.queue.enqueue(userId, changedPeriod);
    if (changedPeriod.value <= currentPeriod.value) {
      for (let period = nextPeriod(changedPeriod); period.value <= currentPeriod.value; period = nextPeriod(period)) {
        await this.queue.enqueue(userId, period);
      }
    }
    this.scheduleMaintenance(userId);
  }

  async currentPeriodChanged(): Promise<void> {
    const userId = await this.currentUserId();
    if (!userId) return;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await this.queue.enqueue(userId, analyticsPeriodForInstant(new Date().toISOString(), timeZone));
    this.scheduleMaintenance(userId);
  }

  async allPeriodsChanged(): Promise<void> {
    const userId = await this.currentUserId();
    if (!userId) return;
    await this.backfillState.requestFullRebuild(userId);
    this.scheduleMaintenance(userId);
  }

  private scheduleMaintenance(userId: string): void {
    void this.runMaintenance(userId).catch(() => {});
  }
}

function nextPeriod(period: ReturnType<typeof analyticsPeriodForInstant>): ReturnType<typeof analyticsPeriodForInstant> {
  const [year, month] = period.value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month, 1);
  return analyticsPeriodForInstant(date.toISOString().slice(0, 10), 'UTC');
}
