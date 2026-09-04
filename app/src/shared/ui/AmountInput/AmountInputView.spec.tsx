import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BackNavigationProvider } from '../BackNavigationProvider';
import { createBackDismissableRegistry } from '../../utils/backNavigation';
import { AmountInputView } from './AmountInputView';

function renderAmount(value = '10.00', change = vi.fn()) {
  return render(
    <AmountInputView
      required={{ config: { label: 'Amount', currency: 'EUR' }, data: {}, state: { value }, status: {} }}
      provided={{ commands: { change } }}
    />
  );
}

describe('AmountInputView calculator', () => {
  it('opens with the current amount, calculates locally and applies once', () => {
    const change = vi.fn();
    renderAmount('10.00', change);

    fireEvent.click(screen.getByRole('button', { name: 'Open amount calculator' }));
    expect(screen.getByRole('dialog', { name: 'Amount calculator' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Digit 1' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Calculator result 10\.00/)).toHaveTextContent('10.00');

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: 'Digit 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Decimal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Digit 5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Equals' }));
    expect(change).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Calculator result 12\.50/)).toHaveTextContent('12.50');

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(change).toHaveBeenCalledTimes(1);
    expect(change).toHaveBeenCalledWith('12.50');
    expect(screen.queryByRole('dialog', { name: 'Amount calculator' })).not.toBeInTheDocument();
  });

  it('does not change the amount on cancel, backdrop or Android back', () => {
    const change = vi.fn();
    const registry = createBackDismissableRegistry();
    render(
      <BackNavigationProvider registry={registry}>
        <AmountInputView required={{ config: { label: 'Amount', currency: 'EUR' }, data: {}, state: { value: '10.00' }, status: {} }} provided={{ commands: { change } }} />
      </BackNavigationProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open amount calculator' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(change).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Open amount calculator' }));
    fireEvent.click(screen.getByTestId('sheet-backdrop'));
    expect(change).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Open amount calculator' }));
    act(() => {
      expect(registry.dismissTopmost()).toBe(true);
    });
    expect(change).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Amount calculator' })).not.toBeInTheDocument();
  });

  it('keeps division by zero controlled and exposes disabled behavior', () => {
    const change = vi.fn();
    renderAmount('10.00', change);
    fireEvent.click(screen.getByRole('button', { name: 'Open amount calculator' }));
    fireEvent.click(screen.getByRole('button', { name: 'Divide' }));
    fireEvent.click(screen.getByRole('button', { name: 'Digit 0' }));
    fireEvent.click(screen.getByRole('button', { name: 'Equals' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Cannot divide by zero');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    expect(change).not.toHaveBeenCalled();
  });

  it('disables the calculator action with the amount', () => {
    render(
      <AmountInputView required={{ config: { label: 'Amount', currency: 'EUR' }, data: {}, state: { value: '10' }, status: { disabled: true } }} provided={{ commands: { change: vi.fn() } }} />,
    );

    expect(screen.getByRole('spinbutton', { name: 'Amount' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Open amount calculator' })).toBeDisabled();
  });
});
