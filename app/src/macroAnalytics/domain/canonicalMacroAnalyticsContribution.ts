import type { MacroAnalyticsContribution } from './macroAnalyticsContribution';

function compareCanonicalText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

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
        .sort((left, right) => compareCanonicalText(left.currency, right.currency))
        .map(({ currency, buckets }) => ({
          currency,
          buckets: [...buckets]
            .sort((left, right) => compareCanonicalText(left.source, right.source) || compareCanonicalText(left.kind, right.kind))
            .map(({ source, kind, amount, count }) => ({ source, kind, amount, count })),
        })),
    },
  });
}
