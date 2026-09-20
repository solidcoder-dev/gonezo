import { balanceImpact, isBalanceInflow, isBalanceOutflow } from '../../../ledger/application/movementSemantics';
import { ExactDecimal } from '../../../shared/domain/exactDecimal';
import type { AnalyticsFlowFact, AnalyticsFlowReport, AnalyticsMoneyDto } from '../analyticsFlowReport';

function money(value: string, currency: string): AnalyticsMoneyDto {
  return { value: ExactDecimal.from(value).toFixed(2), currency };
}

export function calculateUpcomingFlow(
  facts: AnalyticsFlowFact[],
  window: AnalyticsFlowReport['window'],
  now: string,
  currency: string,
): AnalyticsFlowReport['upcoming'] {
  const upcoming = facts.filter((fact) => fact.effectiveAt >= now && fact.effectiveAt >= window.start && fact.effectiveAt < window.endExclusive && fact.source !== 'posted');
  const incoming = upcoming.filter((fact) => isBalanceInflow(fact.type)).sort((left, right) => left.effectiveAt.localeCompare(right.effectiveAt));
  const outgoing = upcoming.filter((fact) => isBalanceOutflow(fact.type)).sort((left, right) => left.effectiveAt.localeCompare(right.effectiveAt));
  const total = (items: AnalyticsFlowFact[]) => items.reduce((sum, fact) => {
    const delta = ExactDecimal.from(balanceImpact(fact.type, fact.amount.value));
    return sum.add(delta.compare(ExactDecimal.from('0')) < 0 ? ExactDecimal.from('0').subtract(delta) : delta);
  }, ExactDecimal.from('0'));
  return {
    incomingTotal: money(total(incoming).toString(), currency),
    outgoingTotal: money(total(outgoing).toString(), currency),
    incomingCount: incoming.length,
    outgoingCount: outgoing.length,
    nextIncomingAt: incoming[0]?.effectiveAt,
    nextOutgoingAt: outgoing[0]?.effectiveAt,
  };
}
