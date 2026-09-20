import type { ProcessedContributionSourcePort } from '../application/ProcessedContributionSourcePort';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { MacroAnalyticsLocalStorageNativePlugin } from './macroAnalyticsLocalStoragePlugin';

export class NativeProcessedContributionSourceAdapter implements ProcessedContributionSourcePort {
  async list({ period, cohort }: Parameters<ProcessedContributionSourcePort['list']>[0]) {
    const { publications } = await MacroAnalyticsLocalStorageNativePlugin.listLatestPublications({ period: period.value });
    return publications
      .filter(({ period: publicationPeriod, contribution }) => publicationPeriod.value === period.value
        && (!cohort || cohort.includes(contribution.dimensions)))
      .map(({ contributorId, contribution }) => Object.freeze({ contributorId: createAnalyticsContributorId(contributorId), contribution }));
  }
}
