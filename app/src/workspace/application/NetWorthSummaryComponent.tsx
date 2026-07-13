import { useEffect, useMemo, useState } from 'react';
import { formatCurrencyAmount } from '../../shared/utils/formatting';
import type { AccountWorkspacePort } from '../../account/application/accounts.port';
import type { LedgerNetWorthCurrencyItem } from '../../ledger/application/ledger.port';
import { NetWorthSummaryView } from '../ui/NetWorthSummary/NetWorthSummaryView';
import type { NetWorthCurrencyView } from '../ui/NetWorthSummary/NetWorthSummaryView';

export type NetWorthSummaryComponentProps = {
  required: {
    context: {
      core: Pick<AccountWorkspacePort, 'ledgerGetNetWorthByCurrency'>;
    };
    config: {
      enabled: boolean;
      refreshSignal: boolean;
    };
  };
  provided?: {
    events?: {
      onError?: (error: { message: string }) => void;
    };
  };
};

type LoadPhase = 'idle' | 'loading' | 'succeeded' | 'failed';

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

function toCurrencyView(item: LedgerNetWorthCurrencyItem): NetWorthCurrencyView {
  return {
    ...item,
    formattedBalance: formatCurrencyAmount(item.balanceAmount, item.currency),
    trend: item.trend && item.trend.length >= 2
      ? {
          ariaLabel: `${item.currency} net worth trend`,
          points: item.trend.map((point) => ({ value: Number(point.balanceAmount) })),
        }
      : undefined,
  };
}

export function NetWorthSummaryComponent({ required, provided }: NetWorthSummaryComponentProps) {
  const { core } = required.context;
  const { enabled, refreshSignal } = required.config;
  const onError = provided?.events?.onError;
  const [items, setItems] = useState<LedgerNetWorthCurrencyItem[]>([]);
  const [loadPhase, setLoadPhase] = useState<LoadPhase>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    async function loadNetWorth() {
      setLoadPhase('loading');
      setError('');
      try {
        const result = await core.ledgerGetNetWorthByCurrency();
        if (!cancelled) {
          setItems(result.items);
          setLoadPhase('succeeded');
        }
      } catch (err) {
        if (!cancelled) {
          const message = toErrorMessage(err);
          setError(message);
          setLoadPhase('failed');
          onError?.({ message });
        }
      }
    }

    void loadNetWorth();

    return () => {
      cancelled = true;
    };
  }, [core, enabled, onError, refreshSignal]);

  const visibleLoadPhase = enabled ? loadPhase : 'idle';
  const visibleError = enabled ? error : '';
  const viewItems = useMemo(
    () => (enabled ? items.map(toCurrencyView) : []),
    [enabled, items],
  );

  return (
    <NetWorthSummaryView
      required={{
        config: {},
        data: { items: viewItems },
        state: {},
        status: { loadPhase: visibleLoadPhase, error: visibleError },
      }}
      provided={{
        commands: {},
      }}
    />
  );
}
