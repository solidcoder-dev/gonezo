import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FlowTabView } from './FlowTabView';
import type { FlowViewModel } from '../../application/flowPresenters';

const report: FlowViewModel = { windowLabel: '1 Jul – 31 Jul', canGoPrevious: true, canGoNext: false, windowRelation: 'current', projectionMode: 'accountBalance', summary: { openingLabel: 'Current balance', opening: '€28,000.00', endLabel: 'Expected end balance', end: '€28,100.00', lowest: '€27,950.00', lowestDate: '10 Jul' }, chart: { lowestAt: '2026-07-10', points: [{ key: 'start', occurredAt: '2026-07-01', label: '1 Jul', balance: 28000, phase: 'posted' }], domain: [27900, 28200], ticks: [27900, 28000, 28100, 28200] }, upcoming: { incoming: '€10.00', outgoing: '€5.00', incomingText: '1 movements · 29 Jul', outgoingText: '1 movements · 30 Jul' }, insights: ['bestPeriod', 'worstPeriod', 'averageDailyFlow', 'highestBalance', 'lowestBalance', 'largestInflow'].map((key) => ({ key, title: key, supportingText: 'Selected window', amount: '€0.00', tone: 'neutral', icon: 'bi bi-activity' })) };

describe('FlowTabView', () => {
  it('renders one open report card, integrated upcoming blocks and six open insights', () => {
    render(<FlowTabView required={{ report, status: { loading: false } }} provided={{ state: { canPrevious: true, canNext: false }, commands: { previous: vi.fn(), next: vi.fn() } }} />);
    expect(screen.getByRole('region', { name: 'Flow summary' })).toBeInTheDocument();
    expect(screen.getByText('Upcoming money in · 1 movements · 29 Jul')).toBeInTheDocument();
    expect(screen.getByText('Upcoming money out · 1 movements · 30 Jul')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(6);
    expect(screen.queryByText('See all')).not.toBeInTheDocument();
  });
});
