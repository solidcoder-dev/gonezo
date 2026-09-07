import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TransactionComposerAmountAccessories } from './TransactionComposerAmountAccessories';

describe('TransactionComposerAmountAccessories', () => {
  it('keeps Items, Sharing and More on the same borderless row contract', () => {
    render(
      <TransactionComposerAmountAccessories
        required={{
          state: {
            currencyCode: 'EUR',
            expenseItemsCount: 7,
            expenseSplitTotal: '625.42',
            mode: 'expense',
            splitApplied: true,
            shareControl: (
              <button type="button" className="w-100 d-flex align-items-center justify-content-between p-0">
                Sharing
              </button>
            ),
          },
          status: { disabled: false },
        }}
        provided={{ commands: { openMovementMore: vi.fn(), openSplitEditor: vi.fn(), removeSplit: vi.fn() } }}
      />,
    );

    const details = screen.getByText('Details').parentElement as HTMLElement;
    const rows = within(details).getAllByRole('button');

    expect(rows).toHaveLength(3);
    rows.forEach((row) => {
      expect(row).toHaveClass('w-100', 'd-flex', 'align-items-center', 'justify-content-between', 'p-0');
    });

    const items = within(details).getByRole('button', { name: 'Edit items, 7 items, 625.42 EUR' });
    expect(items).toHaveClass('border-0', 'bg-transparent', 'p-0');
    expect(items.querySelectorAll('.bi')).toHaveLength(1);
  });
});
