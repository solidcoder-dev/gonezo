import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecurrenceEditorView } from './RecurrenceEditorView';

describe('RecurrenceEditorView', () => {
  it('renders monthly recurrence controls and dispatches changes', () => {
    const setFrequency = vi.fn();
    const setInterval = vi.fn();
    const setMonthlyPattern = vi.fn();
    const setDayOfMonth = vi.fn();
    const setEndKind = vi.fn();
    render(
      <RecurrenceEditorView
        required={{
          config: {},
          data: {},
          state: {
            frequency: 'monthly',
            interval: '1',
            weeklyDay: '1',
            monthlyPattern: 'day_of_month',
            dayOfMonth: '15',
            monthlyOrdinal: '1',
            monthlyWeekday: '1',
            endKind: 'never',
            endDate: '',
            endCount: '12',
          },
          status: { intervalError: 'Interval is required' },
        }}
        provided={{
          commands: {
            setFrequency,
            setInterval,
            setWeeklyDay: vi.fn(),
            setMonthlyPattern,
            setDayOfMonth,
            setMonthlyOrdinal: vi.fn(),
            setMonthlyWeekday: vi.fn(),
            setEndKind,
            setEndDate: vi.fn(),
            setEndCount: vi.fn(),
          },
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText('Recurrence frequency'), { target: { value: 'weekly' } });
    fireEvent.change(screen.getByLabelText('Recurrence interval'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Monthly recurrence rule'), { target: { value: 'nth_weekday' } });
    fireEvent.change(screen.getByLabelText('Monthly day of month'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Recurrence end'), { target: { value: 'on_date' } });

    expect(screen.getByText('Interval is required')).toBeInTheDocument();
    expect(setFrequency).toHaveBeenCalledWith('weekly');
    expect(setInterval).toHaveBeenCalledWith('2');
    expect(setMonthlyPattern).toHaveBeenCalledWith('nth_weekday');
    expect(setDayOfMonth).toHaveBeenCalledWith('20');
    expect(setEndKind).toHaveBeenCalledWith('on_date');
  });

  it('renders conditional weekly and end controls', () => {
    render(
      <RecurrenceEditorView
        required={{
          config: {},
          data: {},
          state: {
            frequency: 'weekly',
            interval: '1',
            weeklyDay: '5',
            monthlyPattern: 'nth_weekday',
            dayOfMonth: '1',
            monthlyOrdinal: '2',
            monthlyWeekday: '3',
            endKind: 'after_occurrences',
            endDate: '',
            endCount: '6',
          },
          status: { endCountError: 'Count is required' },
        }}
        provided={{
          commands: {
            setFrequency: vi.fn(),
            setInterval: vi.fn(),
            setWeeklyDay: vi.fn(),
            setMonthlyPattern: vi.fn(),
            setDayOfMonth: vi.fn(),
            setMonthlyOrdinal: vi.fn(),
            setMonthlyWeekday: vi.fn(),
            setEndKind: vi.fn(),
            setEndDate: vi.fn(),
            setEndCount: vi.fn(),
          },
        }}
      />,
    );

    expect(screen.getByLabelText('Recurrence weekday')).toHaveValue('5');
    expect(screen.getByLabelText('Recurrence end count')).toHaveValue(6);
    expect(screen.getByText('Count is required')).toBeInTheDocument();
    expect(screen.queryByLabelText('Monthly recurrence rule')).not.toBeInTheDocument();
  });
});
