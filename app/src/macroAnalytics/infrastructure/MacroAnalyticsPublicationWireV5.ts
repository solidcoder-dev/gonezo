import type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import type { MacroAnalyticsContributionV5 } from '../domain/macroAnalyticsContribution';

export type MacroAnalyticsPublicationWireV5 = Readonly<{
  protocolVersion: 5;
  contributorId: string;
  period: string;
  revision: number;
  contribution: Omit<MacroAnalyticsContributionV5, 'period'> & Readonly<{ period?: never }>;
}>;

function compareText(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }

export function toMacroAnalyticsPublicationWireV5(publication: MacroAnalyticsPublication): MacroAnalyticsPublicationWireV5 {
  if (publication.protocolVersion !== 5 || publication.contribution.schemaVersion !== 5) throw new Error('Publication V5 serializer requires a V5 publication');
  const { contribution } = publication;
  return {
    protocolVersion: 5,
    contributorId: publication.contributorId,
    period: publication.period.value,
    revision: publication.revision,
    contribution: {
      schemaVersion: 5,
      dimensions: { ...contribution.dimensions },
      financial: { currencies: [...contribution.financial.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({ currency, buckets: [...buckets].sort((a, b) => compareText(a.source, b.source) || compareText(a.kind, b.kind)).map((bucket) => ({ ...bucket })) })) },
      categories: { currencies: [...contribution.categories.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({ currency, buckets: [...buckets].sort((a, b) => compareText(a.source, b.source) || compareText(a.kind, b.kind) || compareText(a.category, b.category)).map((bucket) => ({ ...bucket })) })) },
      recurring: { currencies: [...contribution.recurring.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({ currency, buckets: [...buckets].sort((a, b) => compareText(a.source, b.source) || compareText(a.kind, b.kind)).map((bucket) => ({ ...bucket })) })) },
      sharing: { currencies: [...contribution.sharing.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({ currency, buckets: [...buckets].sort((a, b) => compareText(a.source, b.source) || compareText(a.kind, b.kind)).map((bucket) => ({ ...bucket })) })) },
      merchants: { catalogVersion: contribution.merchants.catalogVersion, currencies: [...contribution.merchants.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({ currency, buckets: [...buckets].sort((a, b) => compareText(a.source, b.source) || compareText(a.kind, b.kind) || compareText(a.merchant, b.merchant)).map((bucket) => ({ ...bucket })) })) },
    },
  };
}

export function serializeMacroAnalyticsPublicationV5(publication: MacroAnalyticsPublication): string {
  return JSON.stringify(toMacroAnalyticsPublicationWireV5(publication));
}
