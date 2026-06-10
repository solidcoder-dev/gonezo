import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SplitSummaryView } from './SplitSummaryView';
import { SplitTriggerView } from './SplitTriggerView';

describe('SplitControlsView', () => {
  it('opens the split editor from the trigger', () => {
    const open = vi.fn();

    render(
      <SplitTriggerView
        required={{
          config: {},
          data: {},
          state: {},
          status: {},
        }}
        provided={{ commands: { open } }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /split amount/i }));

    expect(open).toHaveBeenCalledTimes(1);
  });

  it('renders an applied split summary with edit and remove actions', () => {
    const edit = vi.fn();
    const remove = vi.fn();

    render(
      <SplitSummaryView
        required={{
          config: {},
          data: {},
          state: {
            itemsCount: 2,
            total: '100.00',
            remaining: '0.00',
            currencyCode: 'EUR',
          },
          status: {},
        }}
        provided={{ commands: { edit, remove } }}
      />,
    );

    expect(screen.getByText('Split')).toBeInTheDocument();
    expect(screen.getByText('2 items · 100.00 EUR')).toBeInTheDocument();
    expect(screen.getByText('Remaining: 0.00 EUR')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /edit split/i }));
    fireEvent.click(screen.getByRole('button', { name: /remove split/i }));

    expect(edit).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
