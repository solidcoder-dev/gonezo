import { useEffect, useState } from 'react';
import type { ExpectedPendingOverviewResult, ExpectedPort } from '../../expected/application/expected.port';
import { formatCurrencyAmount } from '../../shared/utils/formatting';
import { PendingExpectedOverviewView, type PendingExpectedCardView } from '../ui/PendingExpectedOverview/PendingExpectedOverviewView';

export type PendingExpectedOverviewPort = Pick<ExpectedPort, 'expectedGetPendingOverview'>;
export type PendingExpectedOverviewComponentProps = { required: { context: { core: PendingExpectedOverviewPort }; config: { enabled: boolean; refreshSignal: boolean } }; provided?: { events?: { onError?: (error: { message: string }) => void; onExpenseSelected?: () => void; onIncomeSelected?: () => void } } };

function errorMessage(error: unknown): string { return error instanceof Error ? error.message : 'Unable to load expected movements.'; }

function card(title: string, summary: ExpectedPendingOverviewResult['expenses'], tone: 'expense' | 'income'): PendingExpectedCardView {
  const [first, second] = summary.amountsByCurrency;
  const sign = tone === 'expense' ? '-' : '+';
  const primaryAmount = first ? `${sign}${formatCurrencyAmount(first.amount, first.currency)}` : '—';
  const secondaryAmount = second ? `${sign}${formatCurrencyAmount(second.amount, second.currency)}` : undefined;
  const moreCount = Math.max(0, summary.amountsByCurrency.length - 2);
  return { title, count: summary.totalCount, primaryAmount, secondaryAmount, moreCurrenciesLabel: moreCount > 0 ? `${moreCount} more ${moreCount === 1 ? 'currency' : 'currencies'}` : undefined, tone, disabled: summary.totalCount === 0, accessibleLabel: `${title}, ${summary.totalCount} pending movements` };
}

export function PendingExpectedOverviewComponent({ required, provided }: PendingExpectedOverviewComponentProps) {
  const [result, setResult] = useState<ExpectedPendingOverviewResult>({ expenses: { totalCount: 0, amountsByCurrency: [] }, incomes: { totalCount: 0, amountsByCurrency: [] } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!required.config.enabled) return;
    let cancelled = false;
    const request = required.context.core.expectedGetPendingOverview;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setError('');
      if (!request) return undefined;
      return request();
    }).then((next) => { if (!cancelled && next) setResult(next); }).catch((err) => { if (!cancelled) { setError(errorMessage(err)); provided?.events?.onError?.({ message: errorMessage(err) }); } }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [provided, required.config.enabled, required.config.refreshSignal, required.context.core]);
  return <PendingExpectedOverviewView required={{ config: {}, data: { cards: [card('Pending expenses', result.expenses, 'expense'), card('Pending incomes', result.incomes, 'income')] }, state: {}, status: { loading, error } }} provided={{ commands: { selectExpense: () => provided?.events?.onExpenseSelected?.(), selectIncome: () => provided?.events?.onIncomeSelected?.() } }} />;
}
