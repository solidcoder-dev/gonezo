import type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';

const sources = ['POSTED', 'EXPECTED', 'SCHEDULED'] as const;
const kinds = ['INCOME', 'EXPENSE', 'TRANSFER_IN', 'TRANSFER_OUT'] as const;

function orderBy<T extends string>(values: readonly T[], left: T, right: T): number {
  return values.indexOf(left) - values.indexOf(right);
}

function compareCanonicalText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

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
        buckets: readonly Readonly<{ source: string; kind: string; amount: string; count: number }>[];
      }>[];
    }>;
  }>;
}>;

export function toMacroAnalyticsPublicationWireV1(publication: MacroAnalyticsPublication): MacroAnalyticsPublicationWireV1 {
  if (publication.protocolVersion !== 1 || publication.contribution.schemaVersion !== 1) {
    throw new Error('Publication V1 serializer requires a V1 publication');
  }
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
          .sort((left, right) => compareCanonicalText(left.currency, right.currency))
          .map(({ currency, buckets }) => ({
            currency,
            buckets: [...buckets]
              .sort((left, right) => orderBy(sources, left.source, right.source) || orderBy(kinds, left.kind, right.kind))
              .map(({ source, kind, amount, count }) => ({ source, kind, amount, count })),
          })),
      },
    },
  };
}

export function serializeMacroAnalyticsPublicationV1(publication: MacroAnalyticsPublication): string {
  return JSON.stringify(toMacroAnalyticsPublicationWireV1(publication));
}
