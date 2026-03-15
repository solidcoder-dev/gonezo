import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CounterpartyField } from './CounterpartyField';

describe('CounterpartyField', () => {
  it('renders merchant placeholder for expense and emits changes', () => {
    const onChange = vi.fn();

    render(<CounterpartyField transactionType="expense" value="" disabled={false} onChange={onChange} />);

    const input = screen.getByLabelText('Source or merchant');
    expect(input).toHaveAttribute('placeholder', 'Merchant (optional)');

    fireEvent.change(input, { target: { value: 'Store A' } });
    expect(onChange).toHaveBeenCalledWith('Store A');
  });

  it('renders note placeholder for transfer', () => {
    const onChange = vi.fn();

    render(<CounterpartyField transactionType="transfer" value="" disabled={false} onChange={onChange} />);

    const input = screen.getByLabelText('Source or merchant');
    expect(input).toHaveAttribute('placeholder', 'Note (optional)');
  });
});
