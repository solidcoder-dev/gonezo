import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NetWorthSummaryView } from './NetWorthSummaryView';
import { buildSmoothedTrendPath } from './netWorthTrendPath';

describe('NetWorthSummaryView', () => {
  it('selects the preferred currency initially and changes balances from the dropdown', () => {
    render(
      <NetWorthSummaryView
        required={{
          config: {},
          data: { items: [
            { currency: 'EUR', balanceAmount: '10.00', formattedBalance: '€10.00' },
            { currency: 'USD', balanceAmount: '20.00', formattedBalance: '$20.00', isPreferred: true },
            { currency: 'GBP', balanceAmount: '30.00', formattedBalance: '£30.00' },
          ] },
          state: {},
          status: { loadPhase: 'succeeded' },
        }}
        provided={{ commands: {} }}
      />,
    );

    const currencySelect = screen.getByRole('combobox', { name: 'Choose balance currency' });
    expect(currencySelect).toHaveValue('USD');
    fireEvent.change(currencySelect, { target: { value: 'GBP' } });
    expect(currencySelect).toHaveValue('GBP');
    expect(screen.getByText('£30.00')).toBeInTheDocument();
  });

  it('renders a full-width trend line without a visual area or indicator capsules', () => {
    render(
      <NetWorthSummaryView
        required={{
          config: {},
          data: {
            items: [
              {
                currency: 'EUR',
                balanceAmount: '290.70',
                formattedBalance: '€290.70',
                trend: {
                  points: [{ value: 10 }, { value: 10 }, { value: 10 }],
                  ariaLabel: 'EUR net worth trend',
                },
              },
              { currency: 'USD', balanceAmount: '50.10', formattedBalance: '$50.10' },
            ],
          },
          state: {},
          status: { loadPhase: 'succeeded' },
        }}
        provided={{ commands: {} }}
      />,
    );

    const trend = screen.getByLabelText('EUR net worth trend');
    expect(trend.querySelector('[class*="trendArea"]')).not.toBeInTheDocument();
    expect(trend.querySelector('[class*="trendLine"]')).toBeInTheDocument();
    expect(trend.querySelector('path')?.getAttribute('d')).not.toMatch(/NaN|Infinity/);

    expect(screen.getByRole('combobox', { name: 'Choose balance currency' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /show (eur|usd)/i })).not.toBeInTheDocument();
  });

  it('renders the available currencies in the dropdown', () => {
    render(
      <NetWorthSummaryView
        required={{
          config: {},
          data: { items: [
            { currency: 'EUR', balanceAmount: '10.00', formattedBalance: '€10.00' },
            { currency: 'USD', balanceAmount: '20.00', formattedBalance: '$20.00' },
          ] },
          state: {},
          status: { loadPhase: 'succeeded' },
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['EUR', 'USD']);
  });

  it('renders a disabled dropdown for a single currency', () => {
    render(
      <NetWorthSummaryView
        required={{
          config: {},
          data: { items: [{ currency: 'EUR', balanceAmount: '10.00', formattedBalance: '€10.00' }] },
          state: {},
          status: { loadPhase: 'succeeded' },
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Choose balance currency' })).toBeDisabled();
  });

  it('does not render a decorative trend area or gradient', () => {
    render(
      <NetWorthSummaryView
        required={{
          config: {},
          data: { items: [{
            currency: 'EUR',
            balanceAmount: '10.00',
            formattedBalance: '€10.00',
            trend: { points: [{ value: 2 }, { value: 8 }], ariaLabel: 'EUR net worth trend' },
          }] },
          state: {},
          status: { loadPhase: 'succeeded' },
        }}
        provided={{ commands: {} }}
      />,
    );

    const trend = screen.getByLabelText('EUR net worth trend');
    const line = trend.querySelector('[class*="trendLine"]');
    const gradient = trend.querySelector('linearGradient');

    expect(line).toBeInTheDocument();
    expect(gradient).not.toBeInTheDocument();
  });

  it('builds a finite smoothed Bézier path for three or more points', () => {
    const path = buildSmoothedTrendPath([10, 12, 8, 11]);

    expect(path).toContain('C');
    expect(path).not.toMatch(/NaN|Infinity/);
    expect(path).toMatch(/^M 2\.00 /);
    expect(path).toMatch(/98\.00 /);
  });

  it.each([
    [[], null],
    [[10], 'M 50.00 48.00'],
    [[10, 12], 'M 2.00 48.00 L 98.00 12.00'],
  ])('keeps trend paths stable for %j', (values, expected) => {
    expect(buildSmoothedTrendPath(values)).toBe(expected);
  });

  it.each([
    [{ value: 2 }, { value: 8 }],
    [{ value: 2 }, { value: 5 }, { value: 8 }, { value: 3 }, { value: 9 }],
  ])('keeps the chart points close to both useful plot edges', (...points) => {
    render(
      <NetWorthSummaryView
        required={{
          config: {},
          data: { items: [{
            currency: 'EUR',
            balanceAmount: '10.00',
            formattedBalance: '€10.00',
            trend: { points, ariaLabel: 'EUR net worth trend' },
          }] },
          state: {},
          status: { loadPhase: 'succeeded' },
        }}
        provided={{ commands: {} }}
      />,
    );

    const path = screen.getByLabelText('EUR net worth trend').querySelector('[class*="trendLine"]')?.getAttribute('d') ?? '';
    expect(path).toMatch(/^M 2\.00 /);
    expect(path).toMatch(/98\.00 /);
    expect(path).not.toMatch(/NaN|Infinity/);
  });

  it('emits the active currency when See all is pressed', () => {
    const onViewAccountsRequested = vi.fn();
    render(
      <NetWorthSummaryView
        required={{
          config: {},
          data: { items: [
            { currency: 'EUR', balanceAmount: '10.00', formattedBalance: '€10.00' },
            { currency: 'USD', balanceAmount: '20.00', formattedBalance: '$20.00' },
          ] },
          state: {},
          status: { loadPhase: 'succeeded' },
        }}
        provided={{ commands: { onViewAccountsRequested } }}
      />,
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Choose balance currency' }), { target: { value: 'USD' } });
    fireEvent.click(screen.getByRole('button', { name: 'See all USD accounts' }));
    expect(onViewAccountsRequested).toHaveBeenCalledWith('USD');
  });

  it('keeps the currency selector in the active currency context without duplicating the currency label', () => {
    render(
      <NetWorthSummaryView
        required={{
          config: {},
          data: { items: [
            { currency: 'EUR', balanceAmount: '10.00', formattedBalance: '€10.00' },
            { currency: 'USD', balanceAmount: '20.00', formattedBalance: '$20.00' },
          ] },
          state: {},
          status: { loadPhase: 'succeeded' },
        }}
        provided={{ commands: {} }}
      />,
    );

    const heading = screen.getByRole('heading', { name: 'Balances by currency' });
    const select = screen.getByRole('combobox', { name: 'Choose balance currency' });
    expect(heading).toBeInTheDocument();
    expect(select.closest('[class*="currencyHeading"]')).toContainElement(select);
    expect(screen.getAllByRole('option', { name: 'EUR' })).toHaveLength(1);
    fireEvent.change(select, { target: { value: 'USD' } });
    expect(screen.getByText('$20.00')).toBeInTheDocument();
  });
  it('shows all currencies in the dropdown without a fake full list action', () => {
    render(
      <NetWorthSummaryView
        required={{
          config: {},
          data: {
            items: [
              { currency: 'EUR', balanceAmount: '290.70', formattedBalance: '€290.70' },
              { currency: 'USD', balanceAmount: '50.10', formattedBalance: '$50.10' },
              { currency: 'GBP', balanceAmount: '25.00', formattedBalance: '£25.00' },
              { currency: 'BRL', balanceAmount: '15.00', formattedBalance: 'R$15.00' },
            ],
          },
          state: {},
          status: { loadPhase: 'succeeded' },
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Balances by currency' })).toBeInTheDocument();
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['EUR', 'USD', 'GBP', 'BRL']);
    expect(screen.queryByRole('button', { name: /net worth currencies/i })).not.toBeInTheDocument();
  });

  it('renders optional net worth trends per currency without requiring backend data today', () => {
    render(
      <NetWorthSummaryView
        required={{
          config: {},
          data: {
            items: [
              {
                currency: 'EUR',
                balanceAmount: '21560.66',
                formattedBalance: '€21,560.66',
                trend: {
                  points: [
                    { value: 18000 },
                    { value: 19000 },
                    { value: 18500 },
                    { value: 21560.66 },
                  ],
                  ariaLabel: 'EUR net worth trend',
                },
              },
              {
                currency: 'USD',
                balanceAmount: '1200.00',
                formattedBalance: '$1,200.00',
                trend: {
                  points: [
                    { value: 900 },
                    { value: 1100 },
                    { value: 1050 },
                    { value: 1200 },
                  ],
                  ariaLabel: 'USD net worth trend',
                },
              },
              {
                currency: 'GBP',
                balanceAmount: '800.00',
                formattedBalance: '£800.00',
              },
            ],
          },
          state: {},
          status: { loadPhase: 'succeeded' },
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(screen.getByLabelText('EUR net worth trend')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Choose balance currency' }), { target: { value: 'USD' } });
    expect(screen.getByLabelText('USD net worth trend')).toBeInTheDocument();
    expect(screen.queryByLabelText('GBP net worth trend')).not.toBeInTheDocument();
  });
});
