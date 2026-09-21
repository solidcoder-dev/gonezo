import type { MacroAnalyticsPublication, MacroAnalyticsPublicationV7 } from '../domain/macroAnalyticsPublication';
import { MACRO_ACCOUNT_TYPE_ORDER } from '../domain/accountBalanceContribution';

export type MacroAnalyticsPublicationWireV7 = Readonly<{
  protocolVersion: 7;
  contributorId: string;
  period: string;
  revision: number;
  contribution: Omit<MacroAnalyticsPublicationV7['contribution'], 'period'> & Readonly<{ period?: never }>;
}>;

function compareText(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }

export function toMacroAnalyticsPublicationWireV7(publication: MacroAnalyticsPublication): MacroAnalyticsPublicationWireV7 {
  if (publication.protocolVersion !== 7 || publication.contribution.schemaVersion !== 7) throw new Error('Publication V7 serializer requires a V7 publication');
  const { contribution } = publication;
  return {
    protocolVersion: 7,
    contributorId: publication.contributorId,
    period: publication.period.value,
    revision: publication.revision,
    contribution: {
      schemaVersion: 7,
      dimensions: { ...contribution.dimensions },
      financial: { currencies: [...contribution.financial.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({ currency, buckets: [...buckets].sort((a, b) => compareText(a.source, b.source) || compareText(a.kind, b.kind)).map((bucket) => ({ ...bucket })) })) },
      categories: { currencies: [...contribution.categories.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({ currency, buckets: [...buckets].sort((a, b) => compareText(a.source, b.source) || compareText(a.kind, b.kind) || compareText(a.category, b.category)).map((bucket) => ({ ...bucket })) })) },
      recurring: { currencies: [...contribution.recurring.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({ currency, buckets: [...buckets].sort((a, b) => compareText(a.source, b.source) || compareText(a.kind, b.kind)).map((bucket) => ({ ...bucket })) })) },
      sharing: { currencies: [...contribution.sharing.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({ currency, buckets: [...buckets].sort((a, b) => compareText(a.source, b.source) || compareText(a.kind, b.kind)).map((bucket) => ({ ...bucket })) })) },
      merchants: { catalogVersion: contribution.merchants.catalogVersion, currencies: [...contribution.merchants.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({ currency, buckets: [...buckets].sort((a, b) => compareText(a.source, b.source) || compareText(a.kind, b.kind) || compareText(a.merchant, b.merchant)).map((bucket) => ({ ...bucket })) })) },
      balances: { currencies: [...contribution.balances.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({ currency, buckets: [...buckets].sort((a, b) => MACRO_ACCOUNT_TYPE_ORDER.indexOf(a.accountType) - MACRO_ACCOUNT_TYPE_ORDER.indexOf(b.accountType)).map((bucket) => ({ ...bucket })) })) },
      tagUsage: { currencies: [...contribution.tagUsage.currencies].sort((a, b) => compareText(a.currency, b.currency)).map(({ currency, buckets }) => ({ currency, buckets: [...buckets].sort((a, b) => compareText(a.source, b.source) || compareText(a.kind, b.kind)).map(({ source, kind, amount, movementCount, taggedAmount, taggedMovementCount }) => ({ source, kind, amount, movementCount, taggedAmount, taggedMovementCount })) })) },
    },
  };
}

export function serializeMacroAnalyticsPublicationV7(publication: MacroAnalyticsPublication): string {
  return JSON.stringify(toMacroAnalyticsPublicationWireV7(publication));
}
