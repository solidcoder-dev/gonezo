import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MovementTimelineRowView } from './MovementTimelineRowView';
import type { MonthlyTimelineItemViewModel } from '../../movements/application/monthlyMovementsTimeline';

const item: MonthlyTimelineItemViewModel = {
  source: 'posted',
  id: 'movement-1',
  occurredOn: '2026-06-24T10:00:00.000Z',
  title: 'digi',
  amountLabel: '€17.68',
  amountSign: '-',
  direction: 'expense',
  icon: { className: 'bi bi-cart', tone: 'expense', accessibleLabel: 'Expense movement' },
  metadata: ['bbva', 'Bills'],
};

describe('MovementTimelineRowView', () => {
  it('renders Home title, metadata, amount, date, and counters', () => {
    render(
      <MovementTimelineRowView
        item={item}
        disabled={false}
        onSelect={vi.fn()}
        variant="home"
        trailingMetadata="Today"
        metadataCounters={{ itemCount: 3, shareCount: 2 }}
      />,
    );

    expect(screen.getByText('digi')).toBeInTheDocument();
    expect(screen.getByText('bbva · Bills')).toBeInTheDocument();
    expect(screen.getByText('-€17.68')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByLabelText('3 items')).toHaveTextContent('3');
    expect(screen.getByLabelText('2 shares')).toHaveTextContent('2');
  });

  it('selects the Home row and preserves disabled behavior', () => {
    const onSelect = vi.fn();
    const { rerender } = render(<MovementTimelineRowView item={item} disabled={false} onSelect={onSelect} variant="home" />);

    fireEvent.click(screen.getByRole('button', { name: /digi/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);

    rerender(<MovementTimelineRowView item={item} disabled onSelect={onSelect} variant="home" />);
    expect(screen.getByRole('button', { name: /digi/ })).toBeDisabled();
  });
});
