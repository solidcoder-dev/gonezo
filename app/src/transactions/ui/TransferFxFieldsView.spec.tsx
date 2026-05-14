import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TransferFxFieldsView } from './TransferFxFieldsView';

describe('TransferFxFieldsView', () => {
  it('renders FX inputs, errors, hint and auto mode controls', () => {
    const changeAmountIn = vi.fn();
    const changeFxRate = vi.fn();
    const changeFxMode = vi.fn();
    render(
      <TransferFxFieldsView
        required={{
          config: {
            amountInLabel: 'Amount in (EUR)',
            fxLabel: 'FX rate (EUR/USD)',
          },
          data: {},
          state: {
            amountIn: '9.00',
            fxRate: '0.90',
            fxMode: 'auto_destination',
          },
          status: {
            disabled: false,
            amountInError: 'Amount in is required',
            fxRateError: 'FX rate is required',
          },
        }}
        provided={{
          commands: {
            changeAmountIn,
            changeFxRate,
            changeFxMode,
          },
        }}
      />,
    );

    expect(screen.getByRole('spinbutton', { name: 'Amount in (EUR)' })).toBeDisabled();
    expect(screen.getByRole('spinbutton', { name: 'FX rate (EUR/USD)' })).not.toBeDisabled();
    expect(screen.getByText('Amount in is required')).toBeInTheDocument();
    expect(screen.getByText('FX rate is required')).toBeInTheDocument();
    expect(screen.getByText('Edit two values; the third one is calculated automatically.')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('spinbutton', { name: 'FX rate (EUR/USD)' }), { target: { value: '0.95' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Auto FX rate' }));

    expect(changeFxRate).toHaveBeenCalledWith('0.95');
    expect(changeFxMode).toHaveBeenCalledWith('auto_rate');
    expect(changeAmountIn).not.toHaveBeenCalled();
  });

  it('locks the FX rate input when auto-rate mode is active', () => {
    render(
      <TransferFxFieldsView
        required={{
          config: {
            amountInLabel: 'Amount in',
            fxLabel: 'FX rate',
          },
          data: {},
          state: {
            amountIn: '',
            fxRate: '',
            fxMode: 'auto_rate',
          },
          status: { disabled: false },
        }}
        provided={{
          commands: {
            changeAmountIn: vi.fn(),
            changeFxRate: vi.fn(),
            changeFxMode: vi.fn(),
          },
        }}
      />,
    );

    expect(screen.getByRole('spinbutton', { name: 'Amount in' })).not.toBeDisabled();
    expect(screen.getByRole('spinbutton', { name: 'FX rate' })).toBeDisabled();
  });
});
