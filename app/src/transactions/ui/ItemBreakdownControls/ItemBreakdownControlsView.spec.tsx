import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ItemBreakdownSummaryView } from './ItemBreakdownSummaryView';
import { ItemBreakdownTriggerView } from './ItemBreakdownTriggerView';

describe('ItemBreakdownControlsView', () => {
  it('opens the items editor from the trigger', () => {
    const open = vi.fn();

    render(
      <ItemBreakdownTriggerView
        required={{
          config: {},
          data: {},
          state: {},
          status: {},
        }}
        provided={{ commands: { open } }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Items' }));

    expect(open).toHaveBeenCalledTimes(1);
  });

  it('renders an applied items summary with edit and remove actions', () => {
    const edit = vi.fn();
    const remove = vi.fn();

    render(
      <ItemBreakdownSummaryView
        required={{
          config: {},
          data: {},
          state: {
            itemsCount: 2,
            total: '100.00',
            currencyCode: 'EUR',
          },
          status: {},
        }}
        provided={{ commands: { edit, remove } }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Edit items, 2 items, 100.00 EUR' })).toBeInTheDocument();
    expect(screen.getByText('2 items · 100.00 EUR')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit items, 2 items, 100.00 EUR' }));

    expect(edit).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
  });
});
