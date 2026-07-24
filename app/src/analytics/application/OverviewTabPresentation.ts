import { formatCurrencyAmount, formatIsoDate } from '../../shared/utils/formatting';
import type { AnalyticsOverviewInsightsResult, AnalyticsOverviewSnapshotResult } from './analytics.port';
import type { OverviewSnapshotCardViewProps } from '../ui/OverviewSnapshotCard/OverviewSnapshotCardView.contract';
import type { OverviewStarterItemView } from '../ui/OverviewStarters/OverviewStartersView.contract';

export function presentOverviewSnapshot(snapshot: AnalyticsOverviewSnapshotResult | undefined, currency: string): OverviewSnapshotCardViewProps['required']['data'] {
  const totals = snapshot?.currentTotals ?? { incomeAmount: '0.00', expenseAmount: '0.00', netFlowAmount: '0.00' };
  const income = numericAmount(totals.incomeAmount);
  const expense = numericAmount(totals.expenseAmount);
  const changeValue = snapshot?.netFlowChangePercent === undefined ? undefined : numericAmount(snapshot.netFlowChangePercent);
  return {
    currentWindowLabel: snapshot?.currentWindow.label ?? '',
    previousWindowLabel: snapshot?.previousWindow?.label,
    comparisonPercent: changeValue === undefined ? undefined : `${changeValue > 0 ? '+' : ''}${changeValue}%`,
    incomeAmount: formatCurrencyAmount(totals.incomeAmount, currency),
    expenseAmount: formatCurrencyAmount(totals.expenseAmount, currency),
    netFlowAmount: signedCurrency(totals.netFlowAmount, currency),
    incomeShare: percentage(income, expense),
    expenseShare: percentage(expense, income),
    netFlowTone: toneFor(numericAmount(totals.netFlowAmount)),
    comparisonTone: toneFor(changeValue ?? 0),
    comparisonDirection: changeValue === undefined || changeValue === 0 ? 'flat' : changeValue > 0 ? 'up' : 'down',
  };
}

export function presentOverviewStarters(snapshot: AnalyticsOverviewSnapshotResult | undefined, insights: AnalyticsOverviewInsightsResult | undefined, currency: string): OverviewStarterItemView[] {
  const items: OverviewStarterItemView[] = [];
  if (snapshot?.biggestExpense) items.push({ key: 'biggestExpense', label: 'Biggest expense', primaryText: snapshot.biggestExpense.title, amount: signedCurrency(snapshot.biggestExpense.amount, currency, 'expense'), supportingText: formatIsoDate(snapshot.biggestExpense.occurredAt), tone: 'expense', icon: 'expense' });
  if (snapshot?.biggestIncome) items.push({ key: 'biggestIncome', label: 'Biggest income', primaryText: snapshot.biggestIncome.title, amount: signedCurrency(snapshot.biggestIncome.amount, currency, 'income'), supportingText: formatIsoDate(snapshot.biggestIncome.occurredAt), tone: 'income', icon: 'income' });
  const presentation: Record<string, Omit<OverviewStarterItemView, 'key' | 'amount'>> = {
    topTags: { label: 'Top tags', primaryText: '', tone: 'expense', icon: 'tag' }, sharedExpenses: { label: 'Shared expenses', primaryText: '', tone: 'sharing', icon: 'sharing' }, transfers: { label: 'Transfers', primaryText: '', tone: 'transfer', icon: 'transfer' }, mostSharedWith: { label: 'Most shared with', primaryText: '', tone: 'sharing', icon: 'sharing' }, recurringImpact: { label: 'Recurring impact', primaryText: '', tone: 'recurring', icon: 'recurring' },
  };
  for (const key of ['topTags', 'sharedExpenses', 'transfers', 'mostSharedWith', 'recurringImpact']) {
    const insight = insights?.items.find((item) => item.key === key);
    if (insight) {
      const item = presentation[key];
      items.push({ key: insight.key, label: item.label, primaryText: insight.subtitle, amount: formatCurrencyAmount(insight.amount, currency), tone: item.tone, icon: item.icon });
    }
  }
  return items;
}

function numericAmount(amount: string): number { const value = Number(amount); return Number.isFinite(value) ? value : 0; }
function percentage(value: number, other: number): number { const maximum = Math.max(Math.abs(value), Math.abs(other)); return maximum === 0 ? 0 : Math.min(100, Math.max(0, Math.abs(value) / maximum * 100)); }
function toneFor(value: number): 'income' | 'expense' | 'neutral' { return value > 0 ? 'income' : value < 0 ? 'expense' : 'neutral'; }
function signedCurrency(amount: string, currency: string, forcedTone?: 'income' | 'expense'): string { const value = numericAmount(amount); const formatted = formatCurrencyAmount(Math.abs(value).toFixed(2), currency); if (value === 0) return formatted; const sign = forcedTone === 'expense' ? '-' : forcedTone === 'income' ? '+' : value > 0 ? '+' : '-'; return `${sign}${formatted}`; }
