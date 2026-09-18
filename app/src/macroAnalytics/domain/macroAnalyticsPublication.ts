import type { AnalyticsContributorId } from './analyticsContributorId';
import type { AnalyticsPeriod } from './analyticsPeriod';
import type { MacroAnalyticsContribution } from './macroAnalyticsContribution';
import { MACRO_ANALYTICS_PUBLICATION_PROTOCOL_VERSION, type MacroAnalyticsPublicationProtocolVersion } from './macroAnalyticsPublicationProtocolVersion';

export type MacroAnalyticsPublication = Readonly<{
  protocolVersion: MacroAnalyticsPublicationProtocolVersion;
  contributorId: AnalyticsContributorId;
  period: AnalyticsPeriod;
  revision: number;
  contribution: MacroAnalyticsContribution;
}>;

export function createMacroAnalyticsPublication(input: Omit<MacroAnalyticsPublication, 'protocolVersion'>): MacroAnalyticsPublication {
  if (!input.contributorId.trim()) throw new Error('Analytics contributor ID must not be empty');
  if (!Number.isSafeInteger(input.revision) || input.revision < 1) throw new Error('Publication revision must be a positive integer');
  if (input.period.kind !== input.contribution.period.kind || input.period.value !== input.contribution.period.value) {
    throw new Error('Publication period must match contribution period');
  }
  return Object.freeze({ protocolVersion: MACRO_ANALYTICS_PUBLICATION_PROTOCOL_VERSION, ...input });
}
