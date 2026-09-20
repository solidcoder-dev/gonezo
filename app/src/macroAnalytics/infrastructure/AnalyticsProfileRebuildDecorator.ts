import type { AnalyticsProfilePort } from '../../analyticsProfile/application/analyticsProfile.port';
import type { MacroAnalyticsBackfillStatePort } from '../application/macroAnalyticsBackfillState.port';

export function withMacroAnalyticsProfileRebuild(
  profile: AnalyticsProfilePort,
  backfillState: Pick<MacroAnalyticsBackfillStatePort, 'requestFullRebuild'>,
): AnalyticsProfilePort {
  return {
    get: (userId) => profile.get(userId),
    async save(draft) {
      const saved = await profile.save(draft);
      await backfillState.requestFullRebuild(draft.userId);
      return saved;
    },
  };
}
