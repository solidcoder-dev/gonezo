import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FinancialAmountView } from './FinancialAmountView';

describe('FinancialAmountView', () => {
  it.each([
    { formattedAmount: '€12.30', sign: '+' as const, tone: 'income' as const },
    { formattedAmount: '$12.30', sign: '-' as const, tone: 'expense' as const },
    { formattedAmount: '¥0.00', sign: undefined, tone: undefined },
  ])('preserves the visible amount presentation', (input) => {
    render(<FinancialAmountView {...input} visibility="visible" />);
    expect(screen.getByText(`${input.sign ?? ''}${input.formattedAmount}`)).toBeInTheDocument();
  });

  it('masks a negative amount without exposing its sign or tone', () => {
    render(<FinancialAmountView formattedAmount="$12.30" sign="-" tone="expense" visibility="hidden" />);
    const amount = screen.getByLabelText('Amount hidden');
    expect(amount).toHaveTextContent('••••••');
    expect(amount).not.toHaveTextContent('$12.30');
    expect(amount).not.toHaveClass('text-danger');
  });

  it('does not retain the hidden value in attributes or hidden text', () => {
    render(<FinancialAmountView formattedAmount="€99.99" sign="+" tone="income" visibility="hidden" />);
    const amount = screen.getByLabelText('Amount hidden');
    expect(amount.getAttribute('title')).toBeNull();
    expect(amount.getAttribute('data-amount')).toBeNull();
    expect(amount.outerHTML).not.toContain('€99.99');
  });
});
