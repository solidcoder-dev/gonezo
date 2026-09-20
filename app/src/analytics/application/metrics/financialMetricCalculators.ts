import { ExactDecimal } from '../../../shared/domain/exactDecimal';
import { createMetricDefinition, MetricId, MetricKey, MetricVersion, moneyMetricValue, ratioMetricValue } from '../../../shared/domain/analyticsMetric';
import { createUserMetricResult, type UserMetricResult } from '../../domain/userMetricResult';
import type { UserMetricCalculator } from './userMetricCalculator';
import type { UserMetricContext, UserMetricFact } from './userMetricContext';

function definition(key: string, valueKind: 'MONEY' | 'RATIO') {
  return createMetricDefinition(MetricId.create(MetricKey.create(key), MetricVersion.create(1)), valueKind);
}

function sumEconomicAmount(facts: readonly UserMetricFact[], type: 'income' | 'expense'): ExactDecimal {
  return facts
    .filter((fact) => fact.type === type)
    .reduce((total, fact) => total.add(ExactDecimal.from(fact.amount)), ExactDecimal.from('0'));
}

function sumBalanceFlow(facts: readonly UserMetricFact[]): ExactDecimal {
  return facts.reduce((total, fact) => {
    if (fact.type === 'transfer_in' || fact.type === 'transfer_out') {
      const amount = ExactDecimal.from(fact.amount);
      return total.add(fact.type === 'transfer_in' ? amount : ExactDecimal.from('0').subtract(amount));
    }
    return total.add(fact.type === 'income'
      ? ExactDecimal.from(fact.amount)
      : ExactDecimal.from('0').subtract(ExactDecimal.from(fact.amount)));
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
    return sumEconomicAmount(context.currentPeriodFacts, 'income');
  }
}

export class ExpenseTotalV1 extends MoneyMetricCalculator {
  readonly definition = definition('expense_total', 'MONEY');
  protected calculateAmount(context: UserMetricContext): ExactDecimal {
    return sumEconomicAmount(context.currentPeriodFacts, 'expense');
  }
}

export class NetBalanceFlowV1 extends MoneyMetricCalculator {
  readonly definition = definition('net_balance_flow', 'MONEY');
  protected calculateAmount(context: UserMetricContext): ExactDecimal {
    return sumBalanceFlow(context.currentPeriodFacts);
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
    return sumEconomicAmount(facts, 'expense');
  }
}

export class NetBalanceFlowChangePercentV1 extends ChangePercentMetricCalculator {
  readonly definition = definition('net_balance_flow_change_percent', 'RATIO');
  protected amount(facts: readonly UserMetricFact[]): ExactDecimal {
    return sumBalanceFlow(facts);
  }
}

export const userMetricCalculators: readonly UserMetricCalculator[] = Object.freeze([
  new IncomeTotalV1(),
  new ExpenseTotalV1(),
  new NetBalanceFlowV1(),
  new ExpenseChangePercentV1(),
  new NetBalanceFlowChangePercentV1(),
]);
