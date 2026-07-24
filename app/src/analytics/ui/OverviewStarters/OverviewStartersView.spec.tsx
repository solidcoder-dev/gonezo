import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OverviewStartersView } from './OverviewStartersView';
import type { OverviewStarterItemView } from './OverviewStartersView.contract';

const items: OverviewStarterItemView[] = [
  { key: 'biggestExpense', label: 'Biggest expense', primaryText: 'Rent', amount: '-€611.59', supportingText: '1 Jul 2026', tone: 'expense', icon: 'expense' },
  { key: 'biggestIncome', label: 'Biggest income', primaryText: 'Car loan', amount: '+€139.48', supportingText: '7 Jul 2026', tone: 'income', icon: 'income' },
  { key: 'topTags', label: 'Top tags', primaryText: 'Travel', amount: '€80.00', tone: 'expense', icon: 'tag' },
  { key: 'sharedExpenses', label: 'Shared expenses', primaryText: '2 shared', amount: '€40.00', tone: 'sharing', icon: 'sharing' },
  { key: 'transfers', label: 'Transfers', primaryText: '4 transfers', amount: '€220.00', tone: 'transfer', icon: 'transfer' },
  { key: 'mostSharedWith', label: 'Most shared with', primaryText: 'Ana', amount: '€30.00', tone: 'sharing', icon: 'sharing' },
  { key: 'recurringImpact', label: 'Recurring impact', primaryText: '1 recurring', amount: '€145.90', tone: 'recurring', icon: 'recurring' },
];

describe('OverviewStartersView', () => {
  it('renders an open two-column preview and exposes all items through See all', () => {
    render(<OverviewStartersView required={{ data: { previewItems: items.slice(0, 6), allItems: items }, status: { loading: false } }} />);

    expect(screen.getByRole('heading', { name: 'Starters' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'See all' })).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByText('Biggest expense')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'See all' }));
    expect(screen.getByRole('dialog', { name: 'All overview starters' })).toBeInTheDocument();
    expect(screen.getByText('Recurring impact')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close starters' }));
    expect(screen.queryByRole('dialog', { name: 'All overview starters' })).not.toBeInTheDocument();
  });

  it('does not show See all when every starter is already visible', () => {
    render(<OverviewStartersView required={{ data: { previewItems: items.slice(0, 2), allItems: items.slice(0, 2) }, status: { loading: false } }} />);
    expect(screen.queryByRole('button', { name: 'See all' })).not.toBeInTheDocument();
  });

  it('renders open skeletons and contextual empty state', () => {
    const { rerender } = render(<OverviewStartersView required={{ data: { previewItems: [], allItems: [] }, status: { loading: true } }} />);
    expect(screen.getByRole('status', { name: 'Loading overview starters' })).toBeInTheDocument();
    rerender(<OverviewStartersView required={{ data: { previewItems: [], allItems: [] }, status: { loading: false } }} />);
    expect(screen.getByText('No starter insights for this period.')).toBeInTheDocument();
  });
});
