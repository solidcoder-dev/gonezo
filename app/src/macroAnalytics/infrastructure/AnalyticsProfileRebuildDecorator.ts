import type { AnalyticsProfilePort } from '../../analyticsProfile/application/analyticsProfile.port';
import type { MacroAnalyticsBackfillStatePort } from '../application/macroAnalyticsBackfillState.port';

export function withMacroAnalyticsProfileRebuild(
  profile: AnalyticsProfilePort,
  backfillState: Pick<MacroAnalyticsBackfillStatePort, 'requestFullRebuild'>,
  runMaintenance: (userId: string) => Promise<void> = async () => {},
): AnalyticsProfilePort {
  return {
    get: (userId) => profile.get(userId),
    async save(draft) {
      const saved = await profile.save(draft);
      await backfillState.requestFullRebuild(draft.userId);
      void runMaintenance(draft.userId).catch(() => {});
      return saved;
    },
  };
}
