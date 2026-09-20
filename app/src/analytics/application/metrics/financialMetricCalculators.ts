import { ExactDecimal } from '../../../shared/domain/exactDecimal';
import { createMetricDefinition, MetricId, MetricKey, MetricVersion, moneyMetricValue, ratioMetricValue } from '../../../shared/domain/analyticsMetric';
import { createUserMetricResult, type UserMetricResult } from '../../domain/userMetricResult';
import type { UserMetricCalculator } from './userMetricCalculator';
import type { UserMetricContext, UserMetricFact } from './userMetricContext';

function definition(key: string, valueKind: 'MONEY' | 'RATIO') {
  return createMetricDefinition(MetricId.create(MetricKey.create(key), MetricVersion.create(1)), valueKind);
}

function sumFacts(facts: readonly UserMetricFact[], include: (fact: UserMetricFact) => boolean, balanceImpact: boolean): ExactDecimal {
  return facts.reduce((total, fact) => {
    if (!include(fact)) return total;
    const amount = ExactDecimal.from(fact.amount);
    return total.add(balanceImpact && (fact.type === 'expense' || fact.type === 'transfer_out')
      ? ExactDecimal.from('0').subtract(amount)
      : amount);
  }, ExactDecimal.from('0'));
}

abstract class MoneyMetricCalculator implements UserMetricCalculator {
  abstract readonly definition: ReturnType<typeof definition>;
  protected abstract calculateAmount(context: UserMetricContext): ExactDecimal;

  calculate(context: UserMetricContext): UserMetricResult {
    return createUserMetricResult(this.definition, moneyMetricValue(this.calculateAmount(context), context.currency));
  }
}

export class IncomeTotalV1 extends MoneyMetricCalculator {
  readonly definition = definition('income_total', 'MONEY');
  protected calculateAmount(context: UserMetricContext): ExactDecimal {
    return sumFacts(context.currentPeriodFacts, (fact) => fact.type === 'income', false);
  }
}

export class ExpenseTotalV1 extends MoneyMetricCalculator {
  readonly definition = definition('expense_total', 'MONEY');
  protected calculateAmount(context: UserMetricContext): ExactDecimal {
    return sumFacts(context.currentPeriodFacts, (fact) => fact.type === 'expense', false);
  }
}

export class NetBalanceFlowV1 extends MoneyMetricCalculator {
  readonly definition = definition('net_balance_flow', 'MONEY');
  protected calculateAmount(context: UserMetricContext): ExactDecimal {
    return sumFacts(context.currentPeriodFacts, () => true, true);
  }
}

abstract class ChangePercentMetricCalculator implements UserMetricCalculator {
  abstract readonly definition: ReturnType<typeof definition>;
  protected abstract amount(facts: readonly UserMetricFact[]): ExactDecimal;

  calculate(context: UserMetricContext): UserMetricResult | null {
    if (!context.comparisonPeriodFacts) return null;
    const previous = this.amount(context.comparisonPeriodFacts);
    if (previous.compare(ExactDecimal.from('0')) === 0) return null;
    const current = this.amount(context.currentPeriodFacts);
    const percentagePoints = current.subtract(previous).multiplyByInteger(100).ratioTo(previous, 2);
    return createUserMetricResult(this.definition, ratioMetricValue(percentagePoints));
  }
}

export class ExpenseChangePercentV1 extends ChangePercentMetricCalculator {
  readonly definition = definition('expense_change_percent', 'RATIO');
  protected amount(facts: readonly UserMetricFact[]): ExactDecimal {
    return sumFacts(facts, (fact) => fact.type === 'expense', false);
  }
}

export class NetBalanceFlowChangePercentV1 extends ChangePercentMetricCalculator {
  readonly definition = definition('net_balance_flow_change_percent', 'RATIO');
  protected amount(facts: readonly UserMetricFact[]): ExactDecimal {
    return sumFacts(facts, () => true, true);
  }
}

export const userMetricCalculators: readonly UserMetricCalculator[] = Object.freeze([
  new IncomeTotalV1(),
  new ExpenseTotalV1(),
  new NetBalanceFlowV1(),
  new ExpenseChangePercentV1(),
  new NetBalanceFlowChangePercentV1(),
]);

export function builtInMetricId(key: string): MetricId {
  return MetricId.create(MetricKey.create(key), MetricVersion.create(1));
}
