import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExpectedMovementsCardView } from './ExpectedMovementsCardView';

describe('ExpectedMovementsCardView', () => {
  it('renders expected movements in a fixed scrollable card', () => {
    const selectMovement = vi.fn();

    render(
      <ExpectedMovementsCardView
        required={{
          config: {},
          data: {
            movements: [
              {
                id: 'expected-1',
                iconClassName: 'bi bi-arrow-up-right',
                title: 'Rent',
                subtitle: 'Main · Today · pending',
                amountLabel: '-$950.00',
                amountTone: 'expense',
              },
            ],
          },
          state: {},
          status: { loading: false, disabled: false },
        }}
        provided={{ commands: { selectMovement } }}
      />,
    );

    const card = screen.getByRole('region', { name: 'Expected movements' });
    expect(within(card).getByRole('heading', { name: 'Expected movements' })).toBeInTheDocument();
    expect(within(card).getByText('Rent')).toBeInTheDocument();
    expect(within(card).getByLabelText('Expected movements list')).toBeInTheDocument();

    fireEvent.click(within(card).getByRole('button', { name: /Rent/i }));

    expect(selectMovement).toHaveBeenCalledWith('expected-1');
  });

  it('shows an empty state when there are no expected movements', () => {
    render(
      <ExpectedMovementsCardView
        required={{
          config: {},
          data: { movements: [] },
          state: {},
          status: { loading: false },
        }}
        provided={{ commands: { selectMovement: vi.fn() } }}
      />,
    );

    expect(screen.getByText('No expected movements.')).toBeInTheDocument();
  });
});
