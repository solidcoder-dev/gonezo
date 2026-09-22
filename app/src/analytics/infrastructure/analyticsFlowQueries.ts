import { balanceImpact } from '../../ledger/application/movementSemantics';
import type { LedgerGetAccountSummaryResult, LedgerGetCashFlowSeriesResult } from '../../ledger/application/ledger.port';
import type { SchedulingMovementItem } from '../../scheduling/application/scheduling.port';
import { buildCashFlowSeries } from '../../ledger/application/cashFlowSeries';
import { buildAnalyticsCashFlowSummary, buildFlowProjection, buildFlowInsights } from '../application/analyticsBuilders';
import { buildAnalyticsFlowReport, type AnalyticsFlowFact } from '../application/analyticsFlowReport';
import { buildFlowProjection as calculateFlowProjection } from '../application/series/flowProjection';
import { calculateFlowSummary } from '../application/series/flowSummary';
import { calculateUpcomingFlow } from '../application/readModels/flowUpcoming';
import { buildFlowInsights as calculateFlowInsights } from '../application/insights/flowInsights';
import { buildSpendingTimelineWindow } from '../application/analyticsBuilders';
import { normalizeAnalyticsPeriodSelection, resolveAnalyticsSpendingWindow } from '../application/spendingReport';
import type {
  AnalyticsCashFlowSeriesInput, AnalyticsCashFlowSummaryResult, AnalyticsCurrencyScopeInput,
  AnalyticsFlowInsightsInput, AnalyticsFlowInsightsResult, AnalyticsFlowProjectionInput, AnalyticsFlowProjectionResult,
  AnalyticsFlowReport, AnalyticsFlowReportInput, AnalyticsFlowUpcomingInput, AnalyticsFlowUpcomingResult,
} from '../application/analytics.port';
import type { AnalyticsQueryPort } from './analyticsQueryScope';
import { analyticsTransactionFilters, listScopedAnalyticsMovements, resolveAnalyticsQueryScope } from './analyticsQueryScope';
import { listAnalyticsMovements } from './analyticsMovementReader';
import { earliestTransactionDate } from './analyticsQueryHelpers';
import { ExactDecimal } from '../../shared/domain/exactDecimal';

async function selectedAccountSummaries(port: AnalyticsQueryPort, accountIds: string[]): Promise<LedgerGetAccountSummaryResult[]> {
  return Promise.all(accountIds.map((accountId) => port.ledgerGetAccountSummary({ accountId })));
}

export async function analyticsGetCashFlowSeries(port: AnalyticsQueryPort, input: AnalyticsCashFlowSeriesInput): Promise<LedgerGetCashFlowSeriesResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const currentWindow = scope.filters.period.kind === 'allTime' ? undefined : buildSpendingTimelineWindow(scope.filters.period, now, 0, undefined, 5, scope.filters.includePlannedMovements);
  const { accounts, transactions } = await listScopedAnalyticsMovements(port, scope.filters, currentWindow);
  return buildCashFlowSeries({ accounts, transactions, currency: input.currency, granularity: input.granularity, periodOffset: input.periodOffset, periodCount: 5, visibleRangeStart: currentWindow?.start ?? earliestTransactionDate(transactions), now });
}

export async function analyticsGetPeriodCashFlowSummary(port: AnalyticsQueryPort, input: AnalyticsCurrencyScopeInput): Promise<AnalyticsCashFlowSummaryResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const currentWindow = scope.filters.period.kind === 'allTime' ? undefined : buildSpendingTimelineWindow(scope.filters.period, now, 0, undefined, 5, scope.filters.includePlannedMovements);
  const { transactions } = await listScopedAnalyticsMovements(port, scope.filters, currentWindow);
  return buildAnalyticsCashFlowSummary(transactions, input.currency);
}

export async function analyticsGetFlowProjection(port: AnalyticsQueryPort, input: AnalyticsFlowProjectionInput): Promise<AnalyticsFlowProjectionResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const windows = buildSpendingTimelineWindow(scope.filters.period, now, input.periodOffset, undefined, 5, scope.filters.includePlannedMovements);
  const [balances, transactions, scheduledResults] = await Promise.all([
    selectedAccountSummaries(port, scope.selectedAccountIds),
    listAnalyticsMovements(port, { accountIds: scope.selectedAccountIds, filters: analyticsTransactionFilters(scope.filters, windows, true), includeIgnoredMovements: scope.filters.includeIgnoredMovements, sharedAmountMode: 'full' }),
    Promise.all(scope.selectedAccountIds.map((accountId) => port.schedulingListMovements({ sourceAccountId: accountId }))),
  ]);
  const currentBalanceAmount = balances.reduce((total, account) => total.add(ExactDecimal.from(account.balanceAmount)), ExactDecimal.from('0')).toFixed(2);
  return buildFlowProjection({ currency: input.currency, currentWindow: windows, period: scope.filters.period, currentBalanceAmount, postedTransactions: transactions.transactions, scheduledMovements: scheduledResults.flatMap((result) => result.items), now });
}

function flowFact(transaction: Awaited<ReturnType<typeof listScopedAnalyticsMovements>>['transactions'][number], currency: string, amountMode: 'personal' | 'full'): AnalyticsFlowFact | undefined {
  const source = transaction.reference?.source;
  if (!source || transaction.type === 'transfer') return undefined;
  return { id: transaction.analyticsFactId ?? transaction.id, source, effectiveAt: transaction.occurredAt, accountId: transaction.accountId, type: transaction.type, amount: { value: amountMode === 'full' ? transaction.analyticsFullAmount : transaction.analyticsPersonalAmount, currency } };
}

function scheduledFlowFacts(movements: SchedulingMovementItem[], selectedAccountIds: Set<string>, currency: string, now: string): AnalyticsFlowFact[] {
  return movements.flatMap((movement) => {
    if (movement.status !== 'active' || movement.currency.trim().toUpperCase() !== currency) return [];
    const effectiveAt = movement.nextDueAt ?? movement.startAt;
    if (!effectiveAt || effectiveAt < now) return [];
    const facts: AnalyticsFlowFact[] = [];
    if (selectedAccountIds.has(movement.sourceAccountId)) facts.push({ id: `scheduled/${movement.id}/out/${effectiveAt}`, source: 'scheduledProjection', effectiveAt, accountId: movement.sourceAccountId, type: movement.type === 'transfer' ? 'transfer_out' : movement.type, amount: { value: movement.amount, currency } });
    if (movement.type === 'transfer' && movement.targetAccountId && selectedAccountIds.has(movement.targetAccountId)) facts.push({ id: `scheduled/${movement.id}/in/${effectiveAt}`, source: 'scheduledProjection', effectiveAt, accountId: movement.targetAccountId, type: 'transfer_in', amount: { value: movement.destinationAmount ?? movement.amount, currency: movement.destinationCurrency?.trim().toUpperCase() ?? currency } });
    return facts;
  });
}

export async function analyticsGetFlowReport(port: AnalyticsQueryPort, input: AnalyticsFlowReportInput): Promise<AnalyticsFlowReport> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  if (scope.selectedAccountIds.length === 0) throw new Error('No compatible accounts for this currency');
  const now = new Date();
  const selection = normalizeAnalyticsPeriodSelection(input.periodSelection);
  const balanceMovementsPromise = listScopedAnalyticsMovements(port, scope.filters, undefined, false);
  const balanceHistory = selection.period.kind === 'allTime' ? await balanceMovementsPromise : undefined;
  const earliestMovement = balanceHistory ? earliestTransactionDate(balanceHistory.transactions)?.toISOString().slice(0, 10) : undefined;
  const resolvedWindow = resolveAnalyticsSpendingWindow(selection, now.toISOString().slice(0, 10), earliestMovement, scope.filters.includePlannedMovements);
  const window = selection.period.kind === 'allTime' && earliestMovement ? { ...resolvedWindow, start: `${new Date(`${earliestMovement}T00:00:00.000Z`).getUTCFullYear()}-01-01`, canGoPrevious: false } : resolvedWindow;
  const windowDates = { start: new Date(`${window.start}T00:00:00.000Z`), end: new Date(`${window.endExclusive}T00:00:00.000Z`) };
  const [accounts, balanceMovements, selectedMovements, scheduledResults] = await Promise.all([
    selectedAccountSummaries(port, scope.selectedAccountIds),
    balanceHistory ?? balanceMovementsPromise,
    listScopedAnalyticsMovements(port, scope.filters, windowDates),
    scope.filters.includePlannedMovements ? Promise.all(scope.compatibleAccounts.map((account) => port.schedulingListMovements({ sourceAccountId: account.id }))) : Promise.resolve([]),
  ]);
  const currency = input.currency.trim().toUpperCase();
  const currentBalance = accounts.reduce((sum, account) => sum.add(ExactDecimal.from(account.balanceAmount)), ExactDecimal.from('0'));
  const postedBalanceFacts = balanceMovements.transactions.map((transaction) => flowFact(transaction, currency, 'full')).filter((fact): fact is AnalyticsFlowFact => Boolean(fact && fact.source === 'posted' && fact.effectiveAt >= `${window.start}T00:00:00.000Z` && fact.effectiveAt < now.toISOString()));
  const windowBalanceImpact = postedBalanceFacts.reduce((sum, fact) => sum.add(ExactDecimal.from(balanceImpact(fact.type, fact.amount.value))), ExactDecimal.from('0'));
  const openingBalance = currentBalance.subtract(windowBalanceImpact);
  const facts = selectedMovements.transactions.map((transaction) => flowFact(transaction, currency, scope.filters.sharedAmountMode)).filter((fact): fact is AnalyticsFlowFact => Boolean(fact));
  const reportFacts = [...facts, ...scheduledFlowFacts(scheduledResults.flatMap((result) => result.items), new Set(scope.selectedAccountIds), currency, now.toISOString())];
  const hasCompleteBalanceScope = scope.filters.sharedAmountMode === 'full' && scope.filters.tagIds.length === 0 && scope.filters.includeIgnoredMovements;
  const projection = calculateFlowProjection({ openingBalance: { value: openingBalance.toFixed(2), currency }, facts: reportFacts, window, now: now.toISOString() });
  return buildAnalyticsFlowReport({ window, windowRelation: window.endExclusive <= now.toISOString().slice(0, 10) ? 'past' : 'current', projectionMode: hasCompleteBalanceScope ? 'accountBalance' : 'filteredImpact', currency, summary: calculateFlowSummary(projection, currency, { value: currentBalance.toFixed(2), currency }), projection, upcoming: calculateUpcomingFlow(reportFacts, window, now.toISOString(), currency), insights: calculateFlowInsights(reportFacts, projection, window, currency) });
}

export async function analyticsGetFlowUpcoming(port: AnalyticsQueryPort, input: AnalyticsFlowUpcomingInput): Promise<AnalyticsFlowUpcomingResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const windows = buildSpendingTimelineWindow(scope.filters.period, now, 0, undefined, 5, scope.filters.includePlannedMovements);
  const { transactions } = await listAnalyticsMovements(port, { accountIds: scope.selectedAccountIds, filters: analyticsTransactionFilters(scope.filters, windows, true), includeIgnoredMovements: scope.filters.includeIgnoredMovements, sharedAmountMode: scope.filters.sharedAmountMode });
  const currency = input.currency.trim().toUpperCase();
  const items = transactions.filter((transaction) => transaction.currency.toUpperCase() === currency).filter((transaction) => transaction.type === 'income' || transaction.type === 'expense').filter((transaction) => new Date(transaction.occurredAt) >= now).map((transaction) => ({ movementId: transaction.id, title: transaction.description || transaction.merchant || (transaction.type === 'income' ? 'Income' : 'Expense'), amount: transaction.analyticsAmount ?? transaction.amount, occurredAt: transaction.occurredAt, type: transaction.type })).sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
  return { incomeItems: items.filter((item) => item.type === 'income').map(({ movementId, title, amount, occurredAt }) => ({ movementId, title, amount, occurredAt })), expenseItems: items.filter((item) => item.type === 'expense').map(({ movementId, title, amount, occurredAt }) => ({ movementId, title, amount, occurredAt })) };
}

export async function analyticsGetFlowInsights(port: AnalyticsQueryPort, input: AnalyticsFlowInsightsInput): Promise<AnalyticsFlowInsightsResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const windows = buildSpendingTimelineWindow(scope.filters.period, now, 0, undefined, 5, scope.filters.includePlannedMovements);
  const { transactions } = await listAnalyticsMovements(port, { accountIds: scope.selectedAccountIds, filters: analyticsTransactionFilters(scope.filters, windows, true), includeIgnoredMovements: scope.filters.includeIgnoredMovements, sharedAmountMode: scope.filters.sharedAmountMode });
  return buildFlowInsights({ postedTransactions: transactions, currency: input.currency, currentWindow: windows, period: scope.filters.period });
}
