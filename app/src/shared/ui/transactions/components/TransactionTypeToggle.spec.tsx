import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TransactionTypeToggle } from './TransactionTypeToggle';

describe('TransactionTypeToggle', () => {
  it('renders current selection and triggers changes', () => {
    const onChange = vi.fn();

    render(<TransactionTypeToggle value="expense" disabled={false} onChange={onChange} />);

    expect(screen.getByRole('radio', { name: 'Expense' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Income' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: 'Transfer' })).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(screen.getByRole('radio', { name: 'Income' }));
    expect(onChange).toHaveBeenCalledWith('income');

    fireEvent.click(screen.getByRole('radio', { name: 'Transfer' }));
    expect(onChange).toHaveBeenCalledWith('transfer');
  });
});
