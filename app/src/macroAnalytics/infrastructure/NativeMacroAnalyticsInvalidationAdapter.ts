import type { MacroAnalyticsInvalidationEffect, MacroAnalyticsInvalidationPort } from '../application/macroAnalyticsInvalidation.port';
import { analyticsPeriodForInstant } from '../domain/analyticsPeriod';
import { NativeContributionRebuildQueueAdapter } from './NativeContributionRebuildQueueAdapter';
import { NativeMacroAnalyticsBackfillStateAdapter } from './NativeMacroAnalyticsBackfillStateAdapter';

export class NativeMacroAnalyticsInvalidationAdapter implements MacroAnalyticsInvalidationPort {
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

  async invalidate(effect: MacroAnalyticsInvalidationEffect): Promise<void> {
    const userId = await this.currentUserId();
    if (!userId) return;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    switch (effect.kind) {
      case 'NONE': return;
      case 'EXACT_PERIOD':
        await this.queue.enqueue(userId, analyticsPeriodForInstant(effect.effectiveAt, timeZone));
        break;
      case 'PERIOD_AND_FOLLOWING':
        for (const period of periodsAffectedByBalanceChange(effect.effectiveAt, new Date().toISOString(), timeZone)) {
          await this.queue.enqueue(userId, period);
        }
        break;
      case 'CURRENT_PERIOD':
        await this.queue.enqueue(userId, analyticsPeriodForInstant(new Date().toISOString(), timeZone));
        break;
      case 'ALL_PERIODS':
        await this.backfillState.requestFullRebuild(userId);
        break;
    }
    this.scheduleMaintenance(userId);
  }

  private scheduleMaintenance(userId: string): void {
    void this.runMaintenance(userId).catch(() => {});
  }
}

export function periodsAffectedByBalanceChange(
  effectiveAt: string,
  currentInstant: string,
  timeZone: string,
): readonly ReturnType<typeof analyticsPeriodForInstant>[] {
  const changedPeriod = analyticsPeriodForInstant(effectiveAt, timeZone);
  const currentPeriod = analyticsPeriodForInstant(currentInstant, timeZone);
  if (changedPeriod.value > currentPeriod.value) return [changedPeriod];
  const periods = [changedPeriod];
  for (let period = nextPeriod(changedPeriod); period.value <= currentPeriod.value; period = nextPeriod(period)) periods.push(period);
  return periods;
}

function nextPeriod(period: ReturnType<typeof analyticsPeriodForInstant>): ReturnType<typeof analyticsPeriodForInstant> {
  const [year, month] = period.value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month, 1);
  return analyticsPeriodForInstant(date.toISOString().slice(0, 10), 'UTC');
}
