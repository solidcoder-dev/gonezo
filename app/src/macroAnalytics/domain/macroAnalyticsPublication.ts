import type { AnalyticsContributorId } from './analyticsContributorId';
import type { AnalyticsPeriod } from './analyticsPeriod';
import type { MacroAnalyticsContributionV1, MacroAnalyticsContributionV2, MacroAnalyticsContributionV3, MacroAnalyticsContributionV4 } from './macroAnalyticsContribution';
import { MACRO_ANALYTICS_PUBLICATION_PROTOCOL_VERSION_V1, MACRO_ANALYTICS_PUBLICATION_PROTOCOL_VERSION_V2, MACRO_ANALYTICS_PUBLICATION_PROTOCOL_VERSION_V3, MACRO_ANALYTICS_PUBLICATION_PROTOCOL_VERSION_V4 } from './macroAnalyticsPublicationProtocolVersion';

type PublicationBase = Readonly<{
  contributorId: AnalyticsContributorId;
  period: AnalyticsPeriod;
  revision: number;
}>;

export type MacroAnalyticsPublicationV1 = PublicationBase & Readonly<{ protocolVersion: 1; contribution: MacroAnalyticsContributionV1 }>;
export type MacroAnalyticsPublicationV2 = PublicationBase & Readonly<{ protocolVersion: 2; contribution: MacroAnalyticsContributionV2 }>;
export type MacroAnalyticsPublicationV3 = PublicationBase & Readonly<{ protocolVersion: 3; contribution: MacroAnalyticsContributionV3 }>;
export type MacroAnalyticsPublicationV4 = PublicationBase & Readonly<{ protocolVersion: 4; contribution: MacroAnalyticsContributionV4 }>;
export type MacroAnalyticsPublication = MacroAnalyticsPublicationV1 | MacroAnalyticsPublicationV2 | MacroAnalyticsPublicationV3 | MacroAnalyticsPublicationV4;

type PublicationInput = PublicationBase & Readonly<{ contribution: MacroAnalyticsContributionV1 | MacroAnalyticsContributionV2 | MacroAnalyticsContributionV3 | MacroAnalyticsContributionV4 }>;

export function createMacroAnalyticsPublication(input: PublicationInput): MacroAnalyticsPublication {
  if (!input.contributorId.trim()) throw new Error('Analytics contributor ID must not be empty');
  if (!Number.isSafeInteger(input.revision) || input.revision < 1) throw new Error('Publication revision must be a positive integer');
  if (input.period.kind !== input.contribution.period.kind || input.period.value !== input.contribution.period.value) {
    throw new Error('Publication period must match contribution period');
  }
  const protocolVersion = input.contribution.schemaVersion === 1 ? MACRO_ANALYTICS_PUBLICATION_PROTOCOL_VERSION_V1
    : input.contribution.schemaVersion === 2 ? MACRO_ANALYTICS_PUBLICATION_PROTOCOL_VERSION_V2
      : input.contribution.schemaVersion === 3 ? MACRO_ANALYTICS_PUBLICATION_PROTOCOL_VERSION_V3 : MACRO_ANALYTICS_PUBLICATION_PROTOCOL_VERSION_V4;
  return Object.freeze({ protocolVersion, ...input }) as MacroAnalyticsPublication;
}
