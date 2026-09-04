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
  it('calculates with equals and commits only with the arrow', () => {
    const change = vi.fn();
    renderAmount('10.00', change);

    fireEvent.click(screen.getByRole('button', { name: 'Open amount calculator' }));
    expect(screen.getByRole('dialog', { name: 'Amount calculator' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Digit 1' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Calculator result 10\.00/)).toHaveTextContent('10.00');
    expect(screen.queryByRole('heading', { name: 'Amount calculator' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close amount calculator' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    expect(screen.getByTestId('sheet-drag-handle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Backspace' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: 'Digit 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Decimal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Digit 5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Equals' }));
    expect(change).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Amount calculator' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use result and continue' }));
    expect(change).toHaveBeenCalledTimes(1);
    expect(change).toHaveBeenCalledWith('12.50');
    expect(screen.queryByRole('dialog', { name: 'Amount calculator' })).not.toBeInTheDocument();
  });

  it('does not change an incomplete operation on dismiss, backdrop or Android back', () => {
    const change = vi.fn();
    const registry = createBackDismissableRegistry();
    render(
      <BackNavigationProvider registry={registry}>
        <AmountInputView required={{ config: { label: 'Amount', currency: 'EUR' }, data: {}, state: { value: '10.00' }, status: {} }} provided={{ commands: { change } }} />
      </BackNavigationProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open amount calculator' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: 'Digit 2' }));
    fireEvent.click(screen.getByTestId('sheet-backdrop'));
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

  it('keeps the original amount when dismissed after calculations', () => {
    const change = vi.fn();
    const registry = createBackDismissableRegistry();
    render(
      <BackNavigationProvider registry={registry}>
        <AmountInputView required={{ config: { label: 'Amount', currency: 'EUR' }, data: {}, state: { value: '10.00' }, status: {} }} provided={{ commands: { change } }} />
      </BackNavigationProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open amount calculator' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: 'Digit 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: 'Digit 3' }));
    act(() => {
      expect(registry.dismissTopmost()).toBe(true);
    });
    expect(change).not.toHaveBeenCalled();
  });

  it('keeps division by zero controlled and exposes disabled behavior', () => {
    const change = vi.fn();
    renderAmount('10.00', change);
    fireEvent.click(screen.getByRole('button', { name: 'Open amount calculator' }));
    fireEvent.click(screen.getByRole('button', { name: 'Divide' }));
    fireEvent.click(screen.getByRole('button', { name: 'Digit 0' }));
    fireEvent.click(screen.getByRole('button', { name: 'Equals' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Cannot divide by zero');
    expect(change).not.toHaveBeenCalled();
  });

  it('does not commit an incomplete operation with the arrow', () => {
    const change = vi.fn();
    renderAmount('10.00', change);
    fireEvent.click(screen.getByRole('button', { name: 'Open amount calculator' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use result and continue' }));

    expect(change).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Amount calculator' })).toBeInTheDocument();
  });

  it('requests focus continuation only after using a result', () => {
    const change = vi.fn();
    const continueEditing = vi.fn();
    render(
      <AmountInputView
        required={{ config: { label: 'Amount', currency: 'EUR' }, data: {}, state: { value: '10.00' }, status: {} }}
        provided={{ commands: { change, continueEditing } }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open amount calculator' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: 'Digit 5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use result and continue' }));

    expect(change).toHaveBeenCalledWith('15.00');
    expect(continueEditing).toHaveBeenCalledTimes(1);
  });

  it('keeps intermediate results local and the sheet open', () => {
    const change = vi.fn();
    renderAmount('10.00', change);
    fireEvent.click(screen.getByRole('button', { name: 'Open amount calculator' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: 'Digit 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(change).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Amount calculator' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Digit 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Equals' }));
    expect(change).not.toHaveBeenCalled();
  });

  it('commits a direct amount only with the arrow', () => {
    const change = vi.fn();
    renderAmount('0.00', change);
    fireEvent.click(screen.getByRole('button', { name: 'Open amount calculator' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    fireEvent.click(screen.getByRole('button', { name: 'Digit 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Digit 5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Equals' }));
    expect(change).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Use result and continue' }));

    expect(change).toHaveBeenCalledWith('25.00');
  });

  it('renders keypad buttons in conventional accessible order', () => {
    renderAmount();
    fireEvent.click(screen.getByRole('button', { name: 'Open amount calculator' }));
    const keypad = screen.getByRole('group', { name: 'Calculator keypad' });
    expect(Array.from(keypad.querySelectorAll('button')).map((button) => button.getAttribute('aria-label'))).toEqual([
      'Digit 7', 'Digit 8', 'Digit 9', 'Divide',
      'Digit 4', 'Digit 5', 'Digit 6', 'Multiply',
      'Digit 1', 'Digit 2', 'Digit 3', 'Subtract',
      'Digit 0', 'Decimal', 'Equals', 'Add',
    ]);
  });

  it('disables the calculator action with the amount', () => {
    render(
      <AmountInputView required={{ config: { label: 'Amount', currency: 'EUR' }, data: {}, state: { value: '10' }, status: { disabled: true } }} provided={{ commands: { change: vi.fn() } }} />,
    );

    expect(screen.getByRole('spinbutton', { name: 'Amount' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Open amount calculator' })).toBeDisabled();
  });
});
