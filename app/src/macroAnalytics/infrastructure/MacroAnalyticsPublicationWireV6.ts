import type { MacroAnalyticsPublication, MacroAnalyticsPublicationV6 } from '../domain/macroAnalyticsPublication';

export type MacroAnalyticsPublicationWireV6 = Readonly<{
  protocolVersion: 6;
  contributorId: string;
  period: string;
  revision: number;
  contribution: Omit<MacroAnalyticsPublicationV6['contribution'], 'period'> & Readonly<{ period?: never }>;
}>;

function compareText(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }

export function toMacroAnalyticsPublicationWireV6(publication: MacroAnalyticsPublication): MacroAnalyticsPublicationWireV6 {
  if (publication.protocolVersion !== 6 || publication.contribution.schemaVersion !== 6) throw new Error('Publication V6 serializer requires a V6 publication');
  const { contribution } = publication;
  return {
    protocolVersion: 6,
    contributorId: publication.contributorId,
    period: publication.period.value,
    revision: publication.revision,
    contribution: {
      schemaVersion: 6,
      dimensions: { ...contribution.dimensions },
      financial: { currencies: [...contribution.financial.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({ currency, buckets: [...buckets].sort((a, b) => compareText(a.source, b.source) || compareText(a.kind, b.kind)).map((bucket) => ({ ...bucket })) })) },
      categories: { currencies: [...contribution.categories.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({ currency, buckets: [...buckets].sort((a, b) => compareText(a.source, b.source) || compareText(a.kind, b.kind) || compareText(a.category, b.category)).map((bucket) => ({ ...bucket })) })) },
      recurring: { currencies: [...contribution.recurring.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({ currency, buckets: [...buckets].sort((a, b) => compareText(a.source, b.source) || compareText(a.kind, b.kind)).map((bucket) => ({ ...bucket })) })) },
      sharing: { currencies: [...contribution.sharing.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({ currency, buckets: [...buckets].sort((a, b) => compareText(a.source, b.source) || compareText(a.kind, b.kind)).map((bucket) => ({ ...bucket })) })) },
      merchants: { catalogVersion: contribution.merchants.catalogVersion, currencies: [...contribution.merchants.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({ currency, buckets: [...buckets].sort((a, b) => compareText(a.source, b.source) || compareText(a.kind, b.kind) || compareText(a.merchant, b.merchant)).map((bucket) => ({ ...bucket })) })) },
      balances: { currencies: [...contribution.balances.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({ currency, buckets: [...buckets].sort((a, b) => compareText(a.accountType, b.accountType)).map((bucket) => ({ ...bucket })) })) },
    },
  };
}

export function serializeMacroAnalyticsPublicationV6(publication: MacroAnalyticsPublication): string {
  return JSON.stringify(toMacroAnalyticsPublicationWireV6(publication));
}
