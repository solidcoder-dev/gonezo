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
