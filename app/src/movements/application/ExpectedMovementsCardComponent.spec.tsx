import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ExpectedMovementItem } from '../../expected/application/expected.port';
import { ExpectedMovementsCardComponent, type ExpectedMovementsCardPort } from './ExpectedMovementsCardComponent';

function expectedMovement(input: Partial<ExpectedMovementItem> & Pick<ExpectedMovementItem, 'id' | 'accountId'>): ExpectedMovementItem {
  return {
    type: 'expense',
    amount: '35',
    currency: 'USD',
    expectedAt: '2026-06-20T00:00:00.000Z',
    description: 'Groceries',
    merchant: 'Market',
    splitItems: [],
    status: 'pending',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...input,
  };
}

function createCore(): ExpectedMovementsCardPort {
  return {
    accountsListBalances: vi.fn(async () => ({
      items: [
        {
          accountId: 'acc-1',
          name: 'Main',
          type: 'cash',
          currency: 'USD',
          status: 'active',
          balanceAmount: '100',
          isDefault: true,
        },
        {
          accountId: 'acc-2',
          name: 'Savings',
          type: 'cash',
          currency: 'EUR',
          status: 'active',
          balanceAmount: '200',
          isDefault: false,
        },
        {
          accountId: 'acc-3',
          name: 'Archived',
          type: 'cash',
          currency: 'USD',
          status: 'archived',
          balanceAmount: '0',
          isDefault: false,
        },
      ],
    })),
    expectedListMovements: vi.fn(async ({ accountId }) => ({
      items: accountId === 'acc-1'
        ? [
            expectedMovement({
              id: 'expected-main',
              accountId,
            }),
          ]
        : [
            expectedMovement({
              id: 'expected-savings',
              accountId,
              type: 'income',
              amount: '120',
              currency: 'EUR',
              expectedAt: '2026-06-18T00:00:00.000Z',
              description: 'Interest',
              merchant: '',
            }),
          ],
    })),
  };
}

describe('ExpectedMovementsCardComponent', () => {
  it('loads pending expected movements from every active account', async () => {
    const core = createCore();

    render(
      <ExpectedMovementsCardComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: false },
        }}
      />,
    );

    expect(await screen.findByText('Interest')).toBeInTheDocument();
    expect(screen.getByText('Market')).toBeInTheDocument();
    expect(screen.getByText(/Savings · .* · pending/)).toBeInTheDocument();
    expect(screen.getByText(/Main · .* · pending/)).toBeInTheDocument();

    await waitFor(() => {
      expect(core.expectedListMovements).toHaveBeenCalledWith({ accountId: 'acc-1' });
      expect(core.expectedListMovements).toHaveBeenCalledWith({ accountId: 'acc-2' });
    });
    expect(core.expectedListMovements).not.toHaveBeenCalledWith({ accountId: 'acc-3' });
  });

  it('sorts expected movements by most recent date and opens the detail sheet', async () => {
    const core = createCore();

    render(
      <ExpectedMovementsCardComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: false },
        }}
      />,
    );

    await screen.findByText('Market');

    const movementRows = screen.getAllByRole('button').filter((button) => (
      button.textContent?.includes('Market') || button.textContent?.includes('Interest')
    ));
    expect(movementRows[0]).toHaveTextContent('Market');
    expect(movementRows[1]).toHaveTextContent('Interest');

    fireEvent.click(movementRows[0]);

    expect(await screen.findByRole('dialog', { name: 'Movement detail' })).toBeInTheDocument();
    expect(screen.getByText('Post movement')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Movement actions' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Movement actions' }));
    expect(screen.getByRole('menuitem', { name: 'Edit expected' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Remove movement' })).not.toBeInTheDocument();
  });

  it('keeps ignored expected movements faded in the home expected list', async () => {
    const core = createCore();
    vi.mocked(core.expectedListMovements).mockImplementation(async ({ accountId }) => ({
      items: accountId === 'acc-1'
        ? [expectedMovement({ id: 'expected-main', accountId, ignored: true })]
        : [],
    }));

    render(
      <ExpectedMovementsCardComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: false },
        }}
      />,
    );

    const movementButton = await screen.findByRole('button', { name: /Market/i });

    expect(movementButton.className).toContain('ignored');
    expect(movementButton).toBeEnabled();
  });
});
