import { balanceImpact } from '../../../ledger/application/movementSemantics';
import { ExactDecimal } from '../../../shared/domain/exactDecimal';
import type { AnalyticsFlowFact, AnalyticsFlowProjectionPoint, AnalyticsFlowReport, AnalyticsMoneyDto } from '../analyticsFlowReport';

function signed(fact: AnalyticsFlowFact): string {
  return balanceImpact(fact.type, fact.amount.value);
}

function money(value: string, currency: string): AnalyticsMoneyDto {
  return { value: ExactDecimal.from(value).toFixed(2), currency };
}

function phase(fact: AnalyticsFlowFact, now: string): 'posted' | 'projected' {
  return fact.source === 'posted' || fact.effectiveAt < now ? 'posted' : 'projected';
}

export function buildFlowProjection(input: {
  openingBalance: AnalyticsMoneyDto;
  facts: AnalyticsFlowFact[];
  window: AnalyticsFlowReport['window'];
  now: string;
}): AnalyticsFlowProjectionPoint[] {
  const facts = [...input.facts]
    .filter((fact) => fact.effectiveAt >= input.window.start && fact.effectiveAt < input.window.endExclusive)
    .sort((left, right) => left.effectiveAt.localeCompare(right.effectiveAt) || left.id.localeCompare(right.id));
  const points: AnalyticsFlowProjectionPoint[] = [{ occurredAt: input.window.start, balance: input.openingBalance, phase: 'posted' }];
  let balance = ExactDecimal.from(input.openingBalance.value);
  for (const fact of facts) {
    balance = balance.add(ExactDecimal.from(signed(fact)));
    const previous = points.at(-1);
    if (previous?.occurredAt === fact.effectiveAt) previous.balance = money(balance.toString(), input.openingBalance.currency);
    else points.push({ occurredAt: fact.effectiveAt, balance: money(balance.toString(), input.openingBalance.currency), phase: phase(fact, input.now) });
  }
  points.push({ occurredAt: input.window.endExclusive, balance: money(balance.toString(), input.openingBalance.currency), phase: facts.some((fact) => phase(fact, input.now) === 'projected') ? 'projected' : 'posted' });
  return points;
}
