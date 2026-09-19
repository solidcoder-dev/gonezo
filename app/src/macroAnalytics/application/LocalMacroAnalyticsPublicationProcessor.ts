import { canonicalMacroAnalyticsContribution } from '../domain/canonicalMacroAnalyticsContribution';
import type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import type { LatestMacroAnalyticsPublicationPort } from './latestMacroAnalyticsPublication.port';
import type { MacroAnalyticsPublicationProcessorPort, PublicationProcessingStatus } from './macroAnalyticsPublicationProcessor.port';

export class LocalMacroAnalyticsPublicationProcessor implements MacroAnalyticsPublicationProcessorPort {
  private readonly latest: LatestMacroAnalyticsPublicationPort;

  constructor(latest: LatestMacroAnalyticsPublicationPort) {
    this.latest = latest;
  }

  async process(publication: MacroAnalyticsPublication): Promise<PublicationProcessingStatus> {
    const current = await this.latest.find(publication.contributorId, publication.period);
    if (!current) {
      await this.latest.save(publication);
      return 'ACCEPTED';
    }
    if (publication.revision > current.revision) {
      await this.latest.save(publication);
      return 'UPDATED';
    }
    if (publication.revision < current.revision) return 'STALE';
    if (canonicalMacroAnalyticsContribution(publication.contribution) === canonicalMacroAnalyticsContribution(current.contribution)) {
      return 'ALREADY_CURRENT';
    }
    return 'REVISION_CONFLICT';
  }
}
