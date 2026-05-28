import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MonthNavigatorView } from './MonthNavigatorView';

describe('MonthNavigatorView', () => {
  it('renders compact controls and opens month actions from center button', () => {
    const onPreviousMonth = vi.fn();
    const onNextMonth = vi.fn();
    const onToggleMenu = vi.fn();

    render(
      <MonthNavigatorView
        required={{
          monthLabel: 'APR 2026',
          disabled: false,
          monthMenuOpen: false,
          isCurrentMonth: false,
        }}
        provided={{
          onPreviousMonth,
          onNextMonth,
          onToggleMenu,
          onGoToCurrentMonth: vi.fn(),
          onOpenMonthPicker: vi.fn(),
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Choose month' }));

    expect(onPreviousMonth).toHaveBeenCalledTimes(1);
    expect(onNextMonth).toHaveBeenCalledTimes(1);
    expect(onToggleMenu).toHaveBeenCalledTimes(1);
  });

  it('shows menu options when open and triggers today/select actions', () => {
    const onGoToCurrentMonth = vi.fn();
    const onOpenMonthPicker = vi.fn();

    render(
      <MonthNavigatorView
        required={{
          monthLabel: 'APR 2026',
          disabled: false,
          monthMenuOpen: true,
          isCurrentMonth: false,
        }}
        provided={{
          onPreviousMonth: vi.fn(),
          onNextMonth: vi.fn(),
          onToggleMenu: vi.fn(),
          onGoToCurrentMonth,
          onOpenMonthPicker,
        }}
      />,
    );

    fireEvent.click(screen.getByRole('menuitem', { name: 'Today' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Select month' }));

    expect(onGoToCurrentMonth).toHaveBeenCalledTimes(1);
    expect(onOpenMonthPicker).toHaveBeenCalledTimes(1);
  });

  it('hides the today action when already in current month', () => {
    render(
      <MonthNavigatorView
        required={{
          monthLabel: 'APR 2026',
          disabled: false,
          monthMenuOpen: true,
          isCurrentMonth: true,
        }}
        provided={{
          onPreviousMonth: vi.fn(),
          onNextMonth: vi.fn(),
          onToggleMenu: vi.fn(),
          onGoToCurrentMonth: vi.fn(),
          onOpenMonthPicker: vi.fn(),
        }}
      />,
    );

    expect(screen.queryByRole('menuitem', { name: 'Today' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Select month' })).toBeInTheDocument();
  });
});
