import type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export type MacroAnalyticsPublicationWireV4 = Readonly<{
  protocolVersion: 4;
  contributorId: string;
  period: string;
  revision: number;
  contribution: Readonly<{
    schemaVersion: 4;
    dimensions: Readonly<{ countryCode: string; regionCode: string; sex: string; ageBand: string }>;
    financial: MacroAnalyticsPublication['contribution']['financial'];
    categories: Extract<MacroAnalyticsPublication['contribution'], { schemaVersion: 4 }>['categories'];
    recurring: Extract<MacroAnalyticsPublication['contribution'], { schemaVersion: 4 }>['recurring'];
    sharing: Extract<MacroAnalyticsPublication['contribution'], { schemaVersion: 4 }>['sharing'];
  }>;
}>;

export function toMacroAnalyticsPublicationWireV4(publication: MacroAnalyticsPublication): MacroAnalyticsPublicationWireV4 {
  if (publication.protocolVersion !== 4 || publication.contribution.schemaVersion !== 4) {
    throw new Error('Publication V4 serializer requires a V4 publication');
  }
  const contribution = publication.contribution;
  return {
    protocolVersion: 4,
    contributorId: publication.contributorId,
    period: publication.period.value,
    revision: publication.revision,
    contribution: {
      schemaVersion: 4,
      dimensions: { ...contribution.dimensions },
      financial: { currencies: [...contribution.financial.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({
        currency,
        buckets: [...buckets].sort((a, b) => compareText(a.source, b.source) || compareText(a.kind, b.kind)).map(({ source, kind, amount, count }) => ({ source, kind, amount, count })),
      })) },
      categories: { currencies: [...contribution.categories.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({
        currency,
        buckets: [...buckets].sort((a, b) => compareText(a.source, b.source) || compareText(a.kind, b.kind) || compareText(a.category, b.category))
          .map(({ source, kind, category, amount }) => ({ source, kind, category, amount })),
      })) },
      recurring: { currencies: [...contribution.recurring.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({
        currency,
        buckets: [...buckets].sort((a, b) => compareText(a.source, b.source) || compareText(a.kind, b.kind))
          .map(({ source, kind, amount, occurrenceCount, seriesCount }) => ({ source, kind, amount, occurrenceCount, seriesCount })),
      })) },
      sharing: { currencies: [...contribution.sharing.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({
        currency,
        buckets: [...buckets].sort((a, b) => compareText(a.source, b.source) || compareText(a.kind, b.kind)).map((bucket) => ({
          source: bucket.source, kind: bucket.kind, fullAmount: bucket.fullAmount, personalAmount: bucket.personalAmount,
          participantAllocatedAmount: bucket.participantAllocatedAmount, settlementRequiredAmount: bucket.settlementRequiredAmount,
          movementCount: bucket.movementCount, participantCount: bucket.participantCount, settlementParticipantCount: bucket.settlementParticipantCount,
        })),
      })) },
    },
  };
}

export function serializeMacroAnalyticsPublicationV4(publication: MacroAnalyticsPublication): string {
  return JSON.stringify(toMacroAnalyticsPublicationWireV4(publication));
}
