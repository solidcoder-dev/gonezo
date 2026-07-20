import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { NetWorthSummaryView } from './NetWorthSummaryView';
import { buildSmoothedTrendPath } from './netWorthTrendPath';

describe('NetWorthSummaryView', () => {
  it('keeps pagination controls compact and centred in the local stylesheet', () => {
    const stylesheet = readFileSync(resolve(process.cwd(), 'src/workspace/ui/NetWorthSummary/NetWorthSummaryView.module.css'), 'utf8');
    const indicatorGroup = stylesheet.match(/\.indicators\s*\{([^}]*)\}/)?.[1] ?? '';
    const indicatorButton = stylesheet.match(/\.indicatorButton\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(indicatorGroup).toMatch(/justify-content:\s*center/);
    expect(indicatorGroup).toMatch(/gap:\s*0(?:;|\s|$)/);
    expect(indicatorButton).toMatch(/width:\s*(2[4-8])px/);
    expect(indicatorButton).not.toMatch(/(?:width|min-width):\s*44px/);
  });
  it('selects the preferred currency initially and follows slides by offset with gaps', () => {
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

    const viewport = screen.getByLabelText('Balances by currency');
    const slides = Array.from(viewport.children) as HTMLElement[];
    Object.defineProperties(viewport, { scrollLeft: { value: 380, configurable: true } });
    Object.defineProperties(slides[0], { offsetLeft: { value: 0, configurable: true } });
    Object.defineProperties(slides[1], { offsetLeft: { value: 248, configurable: true } });
    Object.defineProperties(slides[2], { offsetLeft: { value: 496, configurable: true } });

    expect(screen.getByRole('button', { name: 'Show USD' })).toHaveAttribute('aria-current', 'true');
    fireEvent.scroll(viewport);
    expect(screen.getByRole('button', { name: 'Show GBP' })).toHaveAttribute('aria-current', 'true');
  });

  it('renders a full-width trend area and line without visual indicator capsules', () => {
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
    expect(trend.querySelector('[class*="trendArea"]')).toBeInTheDocument();
    expect(trend.querySelector('[class*="trendLine"]')).toBeInTheDocument();
    expect(trend.querySelector('path')?.getAttribute('d')).not.toMatch(/NaN|Infinity/);

    const indicators = screen.getAllByRole('button', { name: /show (eur|usd)/i });
    expect(indicators).toHaveLength(2);
    expect(indicators[0].querySelector('span')).toBeInTheDocument();
  });

  it('keeps multiple indicators compact, centered, and accessible', () => {
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

    const indicators = screen.getByLabelText('Choose currency');
    expect(indicators.className).toContain('indicators');

    const buttons = screen.getAllByRole('button', { name: /show (eur|usd)/i });
    expect(buttons).toHaveLength(2);
    expect(buttons.every((button) => button.querySelector('span'))).toBe(true);
    expect(buttons[0].className).toContain('indicatorButton');
    expect(buttons[0].querySelector('span')?.className).toContain('indicatorDot');
    expect(buttons.every((button) => button.getAttribute('style')?.includes('44px') !== true)).toBe(true);
    expect(indicators.className).toContain('indicators');
  });

  it('does not render indicators for a single currency', () => {
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

    expect(screen.queryByLabelText('Choose currency')).not.toBeInTheDocument();
  });

  it('renders a visibly stronger gradient for the separate trend area', () => {
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
    const area = trend.querySelector('[class*="trendArea"]');
    const line = trend.querySelector('[class*="trendLine"]');
    const gradient = trend.querySelector('linearGradient');

    expect(area).toBeInTheDocument();
    expect(line).toBeInTheDocument();
    expect(area).not.toBe(line);
    expect(gradient?.querySelector('stop')?.getAttribute('stop-color')).toBe('var(--net-worth-area-start)');
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

    fireEvent.click(screen.getByRole('button', { name: 'Show USD' }));
    fireEvent.click(screen.getByRole('button', { name: 'See all USD accounts' }));
    expect(onViewAccountsRequested).toHaveBeenCalledWith('USD');
  });
  it('shows secondary currencies horizontally without a full list action', () => {
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
    expect(screen.getByText('EUR')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText('GBP')).toBeInTheDocument();
    expect(screen.getByText('BRL')).toBeInTheDocument();
    expect(screen.queryByText('+1 currency')).not.toBeInTheDocument();
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
    expect(screen.getByLabelText('USD net worth trend')).toBeInTheDocument();
    expect(screen.queryByLabelText('GBP net worth trend')).not.toBeInTheDocument();
  });
});
