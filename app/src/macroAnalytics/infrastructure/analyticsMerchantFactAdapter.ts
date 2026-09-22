import type { AnalyticsMovementFactItem } from '../../analytics/application/analyticsMovementFacts.contract';
import type { CanonicalMerchantResolverPort } from '../application/canonicalMerchantResolver.port';
import { UNMAPPED_MACRO_MERCHANT_CODE } from '../domain/macroMerchantCode';
import { createMerchantFact, type MerchantFact, type MerchantFactKind } from '../domain/merchantFact';
import { mapAnalyticsMovementSource } from './analyticsMovementSource';

function merchantFactKind(type: AnalyticsMovementFactItem['type']): MerchantFactKind | undefined {
  if (type === 'income') return 'INCOME';
  if (type === 'expense') return 'EXPENSE';
  return undefined;
}

export function adaptAnalyticsMerchantFact(
  item: AnalyticsMovementFactItem,
  resolver: CanonicalMerchantResolverPort,
): MerchantFact | null {
  if (item.ignored || !item.merchant) return null;
  const kind = merchantFactKind(item.type);
  if (kind === undefined) return null;

  const merchant = resolver.resolve({ merchantKey: item.merchant.key }) ?? UNMAPPED_MACRO_MERCHANT_CODE;
  return createMerchantFact({
    id: `${item.analyticsFactId}/merchant`,
    occurredAt: item.effectiveAt,
    source: mapAnalyticsMovementSource(item.source),
    kind,
    currency: item.currency,
    amount: item.personalAmount,
    merchant,
  });
}
