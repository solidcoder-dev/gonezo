import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AmountSpinnerInput } from './AmountSpinnerInput';

describe('AmountSpinnerInput', () => {
  it('rolls amount with arrow buttons', () => {
    const onRollUnits = vi.fn();

    render(
      <AmountSpinnerInput
        amount="1.00"
        disabled={false}
        onRollUnits={onRollUnits}
        onSetAmount={vi.fn()}
        onFormatAmount={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Increase amount by current step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Decrease amount by current step' }));

    expect(onRollUnits).toHaveBeenNthCalledWith(1, 1);
    expect(onRollUnits).toHaveBeenNthCalledWith(2, -1);
  });

  it('supports inline edit and formats on blur', () => {
    const onSetAmount = vi.fn();
    const onFormatAmount = vi.fn();

    render(
      <AmountSpinnerInput
        amount="1.00"
        disabled={false}
        onRollUnits={vi.fn()}
        onSetAmount={onSetAmount}
        onFormatAmount={onFormatAmount}
      />
    );

    fireEvent.click(screen.getByLabelText('Current amount'));
    fireEvent.change(screen.getByLabelText('Amount value'), { target: { value: '2.3' } });
    fireEvent.blur(screen.getByLabelText('Amount value'));

    expect(onSetAmount).toHaveBeenCalledWith('2.3');
    expect(onFormatAmount).toHaveBeenCalledTimes(1);
  });
});
