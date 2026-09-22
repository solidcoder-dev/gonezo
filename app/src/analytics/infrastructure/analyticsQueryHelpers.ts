import type { AnalyticsCategoryReference, AnalyticsPeriodSelection, AnalyticsSpendingMovement, AnalyticsSpendingPeriodWindow } from '../application/spendingReport';
import { normalizeAnalyticsPeriodSelection } from '../application/spendingReport';
import type { AnalyticsQueryPort } from './analyticsQueryScope';
import type { AnalyticsFilters } from '../application/analyticsFilters';
import { listAnalyticsMovements } from './analyticsMovementReader';
import type { AnalyticsTransactionReadModel } from './analyticsMovementReader';
import { analyticsTransactionFilters } from './analyticsQueryScope';
import type { AnalyticsMoneyDto } from '../application/spendingReport';
import type { UserMetricContext } from '../application/metrics/userMetricContext';
import type { ExactDecimal } from '../../shared/domain/exactDecimal';
import { CalculateUserMetrics } from '../application/metrics/calculateUserMetrics';
import { userMetricCalculators } from '../application/metrics/financialMetricCalculators';
import {
  EXPENSE_CHANGE_PERCENT_V1,
  EXPENSE_TOTAL_V1,
} from '../application/metrics/builtInMetricDefinitions';

export const calculateUserMetrics = new CalculateUserMetrics(userMetricCalculators);

export function earliestTransactionDate(transactions: Array<{ occurredAt: string }>): Date | undefined {
  return transactions.reduce<Date | undefined>((earliest, transaction) => {
    const occurredAt = new Date(transaction.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) return earliest;
    return !earliest || occurredAt < earliest ? occurredAt : earliest;
  }, undefined);
}

export function postedTransactionIds(transactions: Array<{ id: string; reference?: { source: string; transactionId?: string } }>): string[] {
  return transactions
    .filter((transaction) => transaction.reference?.source === 'posted')
    .map((transaction) => transaction.reference?.transactionId)
    .filter((id): id is string => Boolean(id));
}

export function userMetricContext(
  currency: string,
  currentTransactions: AnalyticsTransactionReadModel[],
  comparisonTransactions?: AnalyticsTransactionReadModel[],
): UserMetricContext {
  const factsFrom = (transactions: AnalyticsTransactionReadModel[]) => transactions
    .filter((transaction): transaction is typeof transaction & { type: 'income' | 'expense' | 'transfer_in' | 'transfer_out' } =>
      ['income', 'expense', 'transfer_in', 'transfer_out'].includes(transaction.type))
    .map((transaction) => ({ type: transaction.type, amount: transaction.analyticsAmount }));
  return {
    currency,
    currentPeriodFacts: factsFrom(currentTransactions),
    comparisonPeriodFacts: comparisonTransactions ? factsFrom(comparisonTransactions) : undefined,
  };
}

export function spendingMovement(transaction: AnalyticsTransactionReadModel): AnalyticsSpendingMovement {
  return {
    id: transaction.id,
    occurredAt: transaction.occurredAt,
    type: transaction.type === 'transfer' ? 'transfer_out' : transaction.type,
    currency: transaction.currency,
    amount: transaction.analyticsAmount,
    categoryId: transaction.categoryId,
    categoryName: transaction.category?.name,
    description: transaction.description,
    merchant: transaction.merchant,
    merchantReference: transaction.merchantReference,
    items: transaction.items.map((item) => ({ amount: item.amount, categoryId: item.categoryId, categoryName: item.note })),
  };
}

export function spendingSelection(input: { periodSelection: AnalyticsPeriodSelection }): AnalyticsPeriodSelection {
  return normalizeAnalyticsPeriodSelection(input.periodSelection);
}

export function selectedCategoryMovements(movements: AnalyticsSpendingMovement[], categoryId?: string): AnalyticsSpendingMovement[] {
  if (!categoryId) return movements;
  return movements.filter((movement) => categoryId === 'uncategorized' ? !movement.categoryId : movement.categoryId === categoryId);
}

export async function listAnalyticsCategoryReferences(port: AnalyticsQueryPort): Promise<AnalyticsCategoryReference[]> {
  if (port.analyticsListCategories) return (await port.analyticsListCategories()).items;
  return (await port.taxonomyListCategories({ appliesTo: 'expense', includeArchived: true })).items.map((category) => ({ id: category.id, name: category.name }));
}

export async function listSpendingMovements(
  port: AnalyticsQueryPort,
  filters: AnalyticsFilters,
  accountIds: string[],
  window: AnalyticsSpendingPeriodWindow,
): Promise<{ movements: AnalyticsSpendingMovement[]; transactions: AnalyticsTransactionReadModel[] }> {
  const result = await listAnalyticsMovements(port, {
    accountIds,
    filters: analyticsTransactionFilters(filters, { start: new Date(`${window.start}T00:00:00.000Z`), end: new Date(`${window.endExclusive}T00:00:00.000Z`) }, true),
    includeIgnoredMovements: filters.includeIgnoredMovements,
    sharedAmountMode: filters.sharedAmountMode,
  });
  return { movements: result.transactions.map(spendingMovement), transactions: result.transactions };
}

export function spendingMetricMoney(value: ExactDecimal, currency: string): AnalyticsMoneyDto {
  return { value: value.toFixed(2), currency };
}

export function calculateSpendingReportMetrics(context: UserMetricContext, currency: string, hasPreviousWindow: boolean) {
  const current = calculateUserMetrics.execute(context, [EXPENSE_TOTAL_V1.id])[0];
  const previous = hasPreviousWindow ? calculateUserMetrics.execute({ currency, currentPeriodFacts: context.comparisonPeriodFacts ?? [] }, [EXPENSE_TOTAL_V1.id])[0] : undefined;
  const change = hasPreviousWindow ? calculateUserMetrics.execute(context, [EXPENSE_CHANGE_PERCENT_V1.id])[0] : undefined;
  if (!current || current.value.kind !== 'MONEY') throw new Error('Expense total metric did not return money');
  if (previous && previous.value.kind !== 'MONEY') throw new Error('Previous expense total metric did not return money');
  return {
    totalExpense: spendingMetricMoney(current.value.value, currency),
    previousExpense: previous?.value.kind === 'MONEY' ? spendingMetricMoney(previous.value.value, currency) : undefined,
    changePercent: change?.value.kind === 'RATIO' ? Number(change.value.value.toString()) : undefined,
  };
}
