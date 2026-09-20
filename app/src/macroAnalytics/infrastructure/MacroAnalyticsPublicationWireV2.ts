import type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export type MacroAnalyticsPublicationWireV2 = Readonly<{
  protocolVersion: 2;
  contributorId: string;
  period: string;
  revision: number;
  contribution: Readonly<{
    schemaVersion: 2;
    dimensions: Readonly<{ countryCode: string; regionCode: string; sex: string; ageBand: string }>;
    financial: Readonly<{ currencies: readonly Readonly<{ currency: string; buckets: readonly Readonly<{ source: string; kind: string; amount: string; count: number }>[] }>[] }>;
    categories: Readonly<{ currencies: readonly Readonly<{ currency: string; buckets: readonly Readonly<{ source: string; kind: string; category: string; amount: string }>[] }>[] }>;
  }>;
}>;

export function toMacroAnalyticsPublicationWireV2(publication: MacroAnalyticsPublication): MacroAnalyticsPublicationWireV2 {
  if (publication.protocolVersion !== 2 || publication.contribution.schemaVersion !== 2) {
    throw new Error('Publication V2 serializer requires a V2 publication');
  }
  return {
    protocolVersion: 2,
    contributorId: publication.contributorId,
    period: publication.period.value,
    revision: publication.revision,
    contribution: {
      schemaVersion: 2,
      dimensions: {
        countryCode: publication.contribution.dimensions.countryCode,
        regionCode: publication.contribution.dimensions.regionCode,
        sex: publication.contribution.dimensions.sex,
        ageBand: publication.contribution.dimensions.ageBand,
      },
      financial: { currencies: [...publication.contribution.financial.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({
        currency,
        buckets: [...buckets].sort((a, b) => compareText(a.source, b.source) || compareText(a.kind, b.kind)).map(({ source, kind, amount, count }) => ({ source, kind, amount, count })),
      })) },
      categories: { currencies: [...publication.contribution.categories.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({
        currency,
        buckets: [...buckets].sort((a, b) => compareText(a.source, b.source) || compareText(a.kind, b.kind) || compareText(a.category, b.category))
          .map(({ source, kind, category, amount }) => ({ source, kind, category, amount })),
      })) },
    },
  };
}

export function serializeMacroAnalyticsPublicationV2(publication: MacroAnalyticsPublication): string {
  return JSON.stringify(toMacroAnalyticsPublicationWireV2(publication));
}
