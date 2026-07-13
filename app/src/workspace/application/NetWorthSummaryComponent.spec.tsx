import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { formatCurrencyAmount } from '../../shared/utils/formatting';
import type { LedgerGetNetWorthByCurrencyResult } from '../../ledger/application/ledger.port';
import {
  NetWorthSummaryComponent,
  type NetWorthSummaryComponentProps,
} from './NetWorthSummaryComponent';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function createCore(
  implementation: () => Promise<LedgerGetNetWorthByCurrencyResult>,
): NetWorthSummaryComponentProps['required']['context']['core'] {
  return {
    ledgerGetNetWorthByCurrency: vi.fn(implementation),
  };
}

describe('NetWorthSummaryComponent', () => {
  it('loads net worth and renders the balance', async () => {
    const load = deferred<LedgerGetNetWorthByCurrencyResult>();
    const core = createCore(() => load.promise);

    render(
      <NetWorthSummaryComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: false },
        }}
      />,
    );

    expect(await screen.findByText('Loading balances...')).toBeInTheDocument();
    expect(core.ledgerGetNetWorthByCurrency).toHaveBeenCalledTimes(1);

    await act(async () => {
      load.resolve({
        items: [
          {
            currency: 'EUR',
            balanceAmount: '21560.66',
          },
        ],
      });
      await load.promise;
    });

    expect(screen.getByRole('heading', { name: 'Balances by currency' })).toBeInTheDocument();
    expect(screen.getByText(formatCurrencyAmount('21560.66', 'EUR'))).toBeInTheDocument();
    expect(core.ledgerGetNetWorthByCurrency).toHaveBeenCalledTimes(1);
  });

  it('does not reload when only the provided wrapper identity changes', async () => {
    const core = createCore(async () => ({
      items: [
        {
          currency: 'EUR',
          balanceAmount: '21560.66',
        },
      ],
    }));
    const onError = vi.fn();
    const { rerender } = render(
      <NetWorthSummaryComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: false },
        }}
        provided={{
          events: { onError },
        }}
      />,
    );

    expect(await screen.findByText(formatCurrencyAmount('21560.66', 'EUR'))).toBeInTheDocument();
    expect(core.ledgerGetNetWorthByCurrency).toHaveBeenCalledTimes(1);

    rerender(
      <NetWorthSummaryComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: false },
        }}
        provided={{
          events: {
            onError,
          },
        }}
      />,
    );

    await waitFor(() => expect(core.ledgerGetNetWorthByCurrency).toHaveBeenCalledTimes(1));
    expect(screen.getByText(formatCurrencyAmount('21560.66', 'EUR'))).toBeInTheDocument();
  });

  it('reloads once when refreshSignal changes', async () => {
    const core = createCore(async () => ({
      items: [
        {
          currency: 'EUR',
          balanceAmount: '21560.66',
        },
      ],
    }));
    const onError = vi.fn();
    const provided = {
      events: { onError },
    };
    const { rerender } = render(
      <NetWorthSummaryComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: false },
        }}
        provided={provided}
      />,
    );

    expect(await screen.findByText(formatCurrencyAmount('21560.66', 'EUR'))).toBeInTheDocument();
    expect(core.ledgerGetNetWorthByCurrency).toHaveBeenCalledTimes(1);

    rerender(
      <NetWorthSummaryComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: true },
        }}
        provided={provided}
      />,
    );

    await waitFor(() => expect(core.ledgerGetNetWorthByCurrency).toHaveBeenCalledTimes(2));
  });
});
