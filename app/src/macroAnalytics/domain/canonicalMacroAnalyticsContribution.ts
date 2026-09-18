import type { MacroAnalyticsContribution } from './macroAnalyticsContribution';

export function canonicalMacroAnalyticsContribution(contribution: MacroAnalyticsContribution): string {
  return JSON.stringify({
    schemaVersion: contribution.schemaVersion,
    period: { kind: contribution.period.kind, value: contribution.period.value },
    dimensions: {
      countryCode: contribution.dimensions.countryCode,
      regionCode: contribution.dimensions.regionCode,
      sex: contribution.dimensions.sex,
      ageBand: contribution.dimensions.ageBand,
    },
    financial: {
      currencies: [...contribution.financial.currencies]
        .sort((left, right) => left.currency.localeCompare(right.currency))
        .map(({ currency, buckets }) => ({
          currency,
          buckets: [...buckets]
            .sort((left, right) => left.source.localeCompare(right.source) || left.kind.localeCompare(right.kind))
            .map(({ source, kind, amount, count }) => ({ source, kind, amount, count })),
        })),
    },
  });
}
