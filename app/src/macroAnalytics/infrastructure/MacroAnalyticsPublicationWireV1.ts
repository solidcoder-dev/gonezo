import type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';

export type MacroAnalyticsPublicationWireV1 = Readonly<{
  protocolVersion: 1;
  contributorId: string;
  period: string;
  revision: number;
  contribution: Readonly<{
    schemaVersion: 1;
    dimensions: Readonly<{
      countryCode: string;
      regionCode: string;
      sex: string;
      ageBand: string;
    }>;
    financial: Readonly<{
      currencies: readonly Readonly<{
        currency: string;
        buckets: readonly Readonly<{ source: string; kind: string; amount: string; count: number }> [];
      }>[];
    }>;
  }>;
}>;

export function toMacroAnalyticsPublicationWireV1(publication: MacroAnalyticsPublication): MacroAnalyticsPublicationWireV1 {
  return {
    protocolVersion: 1,
    contributorId: publication.contributorId,
    period: publication.period.value,
    revision: publication.revision,
    contribution: {
      schemaVersion: 1,
      dimensions: {
        countryCode: publication.contribution.dimensions.countryCode,
        regionCode: publication.contribution.dimensions.regionCode,
        sex: publication.contribution.dimensions.sex,
        ageBand: publication.contribution.dimensions.ageBand,
      },
      financial: {
        currencies: [...publication.contribution.financial.currencies]
          .sort((left, right) => left.currency.localeCompare(right.currency))
          .map(({ currency, buckets }) => ({
            currency,
            buckets: [...buckets].map(({ source, kind, amount, count }) => ({ source, kind, amount, count })),
          })),
      },
    },
  };
}

export function serializeMacroAnalyticsPublicationV1(publication: MacroAnalyticsPublication): string {
  return JSON.stringify(toMacroAnalyticsPublicationWireV1(publication));
}
