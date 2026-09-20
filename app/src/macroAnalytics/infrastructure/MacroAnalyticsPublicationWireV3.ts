import type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export type MacroAnalyticsPublicationWireV3 = Readonly<{
  protocolVersion: 3;
  contributorId: string;
  period: string;
  revision: number;
  contribution: Readonly<{
    schemaVersion: 3;
    dimensions: Readonly<{ countryCode: string; regionCode: string; sex: string; ageBand: string }>;
    financial: Readonly<{ currencies: readonly Readonly<{ currency: string; buckets: readonly Readonly<{ source: string; kind: string; amount: string; count: number }>[] }>[] }>;
    categories: Readonly<{ currencies: readonly Readonly<{ currency: string; buckets: readonly Readonly<{ source: string; kind: string; category: string; amount: string }>[] }>[] }>;
    recurring: Readonly<{ currencies: readonly Readonly<{ currency: string; buckets: readonly Readonly<{ source: string; kind: string; amount: string; occurrenceCount: number; seriesCount: number }>[] }>[] }>;
  }>;
}>;

export function toMacroAnalyticsPublicationWireV3(publication: MacroAnalyticsPublication): MacroAnalyticsPublicationWireV3 {
  if (publication.protocolVersion !== 3 || publication.contribution.schemaVersion !== 3) {
    throw new Error('Publication V3 serializer requires a V3 publication');
  }
  const contribution = publication.contribution;
  return {
    protocolVersion: 3,
    contributorId: publication.contributorId,
    period: publication.period.value,
    revision: publication.revision,
    contribution: {
      schemaVersion: 3,
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
    },
  };
}

export function serializeMacroAnalyticsPublicationV3(publication: MacroAnalyticsPublication): string {
  return JSON.stringify(toMacroAnalyticsPublicationWireV3(publication));
}
