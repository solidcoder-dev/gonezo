import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PendingExpectedOverviewView, type PendingExpectedCardView } from './PendingExpectedOverviewView';

function card(overrides: Partial<PendingExpectedCardView> = {}): PendingExpectedCardView {
  return {
    title: 'Pending expenses',
    count: 3,
    primaryAmount: '-€17.68',
    tone: 'expense',
    disabled: false,
    accessibleLabel: 'Pending expenses, 3 pending movements',
    ...overrides,
  };
}

function renderView(cards: [PendingExpectedCardView, PendingExpectedCardView], loading = false) {
  return render(
    <PendingExpectedOverviewView
      required={{ data: { cards }, config: {}, state: {}, status: { loading } }}
      provided={{ commands: { selectExpense: vi.fn(), selectIncome: vi.fn() } }}
    />,
  );
}

describe('PendingExpectedOverviewView', () => {
  it('renders two accessible buttons with visible tone-specific counts and icons', () => {
    renderView([card(), card({ title: 'Pending incomes', count: 7, tone: 'income', accessibleLabel: 'Pending incomes, 7 pending movements' })]);

    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByText('Pending expenses')).toBeInTheDocument();
    expect(screen.getByText('Pending incomes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pending expenses/ })).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: /Pending incomes/ })).toHaveTextContent('7');
    expect(screen.getByRole('button', { name: /Pending expenses/ }).querySelector('.bi-arrow-down-right')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pending incomes/ }).querySelector('.bi-arrow-up-right')).toBeInTheDocument();
  });

  it('renders only the primary amount for one currency', () => {
    renderView([card(), card({ title: 'Pending incomes', tone: 'income' })]);

    expect(screen.getAllByText('-€17.68')).toHaveLength(2);
    expect(screen.queryByText(/more currenc/)).not.toBeInTheDocument();
  });

  it('renders secondary and additional currency information', () => {
    renderView([
      card({ secondaryAmount: '-R$940.00' }),
      card({ title: 'Pending incomes', tone: 'income', primaryAmount: '+€20.00', secondaryAmount: '+$10.00', moreCurrenciesLabel: '2 more currencies' }),
    ]);

    expect(screen.getByText('-R$940.00')).toBeInTheDocument();
    expect(screen.getByText('+$10.00 · 2 more currencies')).toBeInTheDocument();
  });

  it('keeps zero-count cards disabled and loading skeletons at the card size', () => {
    renderView([card({ count: 0, disabled: true }), card({ title: 'Pending incomes', tone: 'income', count: 0, disabled: true })]);
    expect(screen.getAllByRole('button').every((button) => (button as HTMLButtonElement).disabled)).toBe(true);

    const { container } = renderView([card(), card({ title: 'Pending incomes', tone: 'income' })], true);
    expect(container.querySelector('section')).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelectorAll('[class*="skeleton"]')).toHaveLength(2);
  });

  it('renders an error without replacing the two-card structure', () => {
    render(
      <PendingExpectedOverviewView
        required={{ data: { cards: [card(), card({ title: 'Pending incomes', tone: 'income' })] }, config: {}, state: {}, status: { loading: false, error: 'Unable to load expected movements.' } }}
        provided={{ commands: { selectExpense: vi.fn(), selectIncome: vi.fn() } }}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load expected movements.');
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
