import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnalyticsCurrencySelectorView } from './AnalyticsCurrencySelectorView';

describe('AnalyticsCurrencySelectorView', () => {
  it('keeps the selected currency visible when there is only one option', () => {
    render(
      <AnalyticsCurrencySelectorView
        required={{
          data: { currencies: ['EUR'], selectedCurrency: 'EUR' },
          status: { loading: false },
        }}
        provided={{ commands: { selectCurrency: vi.fn() } }}
      />,
    );

    expect(screen.getByLabelText('Analytics currency')).toHaveValue('EUR');
    expect(screen.getByLabelText('Analytics currency')).toBeDisabled();
    expect(screen.queryByText('Currency')).not.toBeInTheDocument();
  });

  it('allows switching currency when multiple options are available', () => {
    const selectCurrency = vi.fn();

    render(
      <AnalyticsCurrencySelectorView
        required={{
          data: { currencies: ['EUR', 'USD'], selectedCurrency: 'EUR' },
          status: { loading: false },
        }}
        provided={{ commands: { selectCurrency } }}
      />,
    );

    fireEvent.change(screen.getByLabelText('Analytics currency'), { target: { value: 'USD' } });

    expect(selectCurrency).toHaveBeenCalledWith('USD');
  });
});
