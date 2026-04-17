import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { YearMonthSelectorView } from './YearMonthSelectorView';

describe('YearMonthSelectorView', () => {
  it('renders year controls and twelve month buttons', () => {
    render(
      <YearMonthSelectorView
        required={{
          year: 2026,
          viewedYear: 2026,
          viewedMonthIndex: 3,
          currentYear: 2026,
          currentMonthIndex: 5,
          disabled: false,
        }}
        provided={{
          onPreviousYear: vi.fn(),
          onNextYear: vi.fn(),
          onSelectMonth: vi.fn(),
        }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Previous year' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next year' })).toBeInTheDocument();
    expect(screen.getByText('2026')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Select [A-Z]{3} 2026$/ })).toHaveLength(12);
  });

  it('triggers callbacks from year and month actions', () => {
    const onPreviousYear = vi.fn();
    const onNextYear = vi.fn();
    const onSelectMonth = vi.fn();

    render(
      <YearMonthSelectorView
        required={{
          year: 2026,
          viewedYear: 2026,
          viewedMonthIndex: 3,
          currentYear: 2026,
          currentMonthIndex: 5,
          disabled: false,
        }}
        provided={{
          onPreviousYear,
          onNextYear,
          onSelectMonth,
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Previous year' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next year' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select APR 2026' }));

    expect(onPreviousYear).toHaveBeenCalledTimes(1);
    expect(onNextYear).toHaveBeenCalledTimes(1);
    expect(onSelectMonth).toHaveBeenCalledWith(3);
  });

  it('marks viewed and current months with specific classes', () => {
    render(
      <YearMonthSelectorView
        required={{
          year: 2026,
          viewedYear: 2026,
          viewedMonthIndex: 3,
          currentYear: 2026,
          currentMonthIndex: 5,
          disabled: false,
        }}
        provided={{
          onPreviousYear: vi.fn(),
          onNextYear: vi.fn(),
          onSelectMonth: vi.fn(),
        }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Select APR 2026' })).toHaveClass('month-selector-month-button--viewed');
    expect(screen.getByRole('button', { name: 'Select JUN 2026' })).toHaveClass('month-selector-month-button--current');
  });
});
