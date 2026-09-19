import type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';

export type PublicationProcessingStatus = 'ACCEPTED' | 'UPDATED' | 'ALREADY_CURRENT' | 'STALE' | 'REVISION_CONFLICT';

export type MacroAnalyticsPublicationProcessorPort = Readonly<{
  process(publication: MacroAnalyticsPublication): Promise<PublicationProcessingStatus>;
}>;
