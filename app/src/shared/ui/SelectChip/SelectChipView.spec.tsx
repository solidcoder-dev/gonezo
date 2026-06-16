import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SelectChipView } from './SelectChipView';

describe('SelectChipView', () => {
  it('renders a semantic tone and dispatches press commands', () => {
    const press = vi.fn();

    render(
      <SelectChipView
        required={{
          config: {
            label: 'Expense',
            ariaLabel: 'Choose movement type: Expense',
            tone: 'expense',
          },
          data: {},
          state: {},
          status: { disabled: false },
        }}
        provided={{ commands: { press } }}
      />,
    );

    const chip = screen.getByRole('button', { name: 'Choose movement type: Expense' });
    expect(chip).toHaveClass('select-chip--expense');
    fireEvent.click(chip);
    expect(press).toHaveBeenCalledTimes(1);
  });
});
