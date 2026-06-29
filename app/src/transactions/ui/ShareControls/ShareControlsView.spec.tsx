import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShareControlsView } from './ShareControlsView';

describe('ShareControlsView', () => {
  it('opens share from the detail chip before it is applied', () => {
    const open = vi.fn();

    render(
      <ShareControlsView
        required={{
          config: {},
          data: {},
          state: { applied: false, peopleCount: 0, total: '10.00', currencyCode: 'EUR' },
          status: {},
        }}
        provided={{ commands: { open, remove: vi.fn() } }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    expect(open).toHaveBeenCalledTimes(1);
  });

  it('renders an applied share as a compact highlighted detail chip', () => {
    const open = vi.fn();
    const remove = vi.fn();

    render(
      <ShareControlsView
        required={{
          config: {},
          data: {},
          state: { applied: true, peopleCount: 3, total: '10.00', currencyCode: 'EUR' },
          status: {},
        }}
        provided={{ commands: { open, remove } }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit share, 2 owe you, 10.00 EUR' }));

    expect(screen.getByText('2 owe you')).toBeInTheDocument();
    expect(open).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
  });
});
