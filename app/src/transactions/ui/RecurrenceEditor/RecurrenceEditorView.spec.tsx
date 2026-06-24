import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecurrenceEditorView } from './RecurrenceEditorView';

function baseCommands(overrides = {}) {
  return {
    closeEditor: vi.fn(),
    applySchedule: vi.fn(),
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
    ...overrides,
  };
}

describe('RecurrenceEditorView', () => {
  it('renders the summary screen and applies the schedule', () => {
    const applySchedule = vi.fn();
    render(
      <RecurrenceEditorView
        required={{
          config: { title: 'Recurring schedule' },
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
            nextOccurrenceDate: '2026-06-15',
          },
          status: { intervalError: 'Interval is required' },
        }}
        provided={{ commands: baseCommands({ applySchedule }) }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Recurring schedule' })).toBeInTheDocument();
    expect(screen.getByText('Next occurrence: 15 Jun')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Repeat: Monthly' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Every: 1 month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'On: Day 15' })).toBeInTheDocument();
    expect(screen.getByText('Interval is required')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Apply schedule' }));

    expect(applySchedule).toHaveBeenCalledTimes(1);
  });

  it('opens repeat selection and dispatches changes', () => {
    const setFrequency = vi.fn();
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
            dayOfMonth: '19',
            monthlyOrdinal: '1',
            monthlyWeekday: '1',
            endKind: 'never',
            endDate: '',
            endCount: '12',
            nextOccurrenceDate: '2026-06-19',
          },
          status: {},
        }}
        provided={{ commands: baseCommands({ setFrequency }) }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Repeat: Monthly' }));
    fireEvent.click(screen.getByRole('button', { name: 'Weekly' }));

    expect(setFrequency).toHaveBeenCalledWith('weekly');
    expect(screen.getByRole('heading', { name: 'Recurring schedule' })).toBeInTheDocument();
  });

  it('renders conditional on and end controls', () => {
    const setWeeklyDay = vi.fn();
    const setEndCount = vi.fn();
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
            nextOccurrenceDate: '2026-05-22',
          },
          status: { endCountError: 'Count is required' },
        }}
        provided={{ commands: baseCommands({ setWeeklyDay, setEndCount }) }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'On: Friday' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tuesday' }));

    expect(setWeeklyDay).toHaveBeenCalledWith('2');
    expect(screen.getByRole('heading', { name: 'Recurring schedule' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ends: 6 occurrences' }));
    fireEvent.change(screen.getByLabelText('Recurrence end count'), { target: { value: '8' } });

    expect(screen.getByText('Count is required')).toBeInTheDocument();
    expect(setEndCount).toHaveBeenCalledWith('8');
  });

  it('formats manually typed end date in the schedule date field', () => {
    const setEndDate = vi.fn();
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
            dayOfMonth: '19',
            monthlyOrdinal: '1',
            monthlyWeekday: '1',
            endKind: 'on_date',
            endDate: '',
            endCount: '12',
            nextOccurrenceDate: '2026-06-19',
          },
          status: {},
        }}
        provided={{ commands: baseCommands({ setEndDate }) }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ends: On date' }));
    fireEvent.change(screen.getByLabelText('Recurrence end date'), { target: { value: '20261231' } });

    expect(screen.getByRole('button', { name: 'Open calendar' })).toBeInTheDocument();
    expect(setEndDate).toHaveBeenCalledWith('2026-12-31');
  });

  it('opens the monthly day picker from the On screen', () => {
    const setMonthlyPattern = vi.fn();
    const setDayOfMonth = vi.fn();
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
            dayOfMonth: '19',
            monthlyOrdinal: '1',
            monthlyWeekday: '1',
            endKind: 'never',
            endDate: '',
            endCount: '12',
            nextOccurrenceDate: '2026-06-19',
          },
          status: {},
        }}
        provided={{ commands: baseCommands({ setMonthlyPattern, setDayOfMonth }) }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'On: Day 19' }));
    fireEvent.click(screen.getByRole('button', { name: 'Day: Day 19' }));
    fireEvent.click(screen.getByRole('button', { name: '20' }));

    expect(screen.getByRole('heading', { name: 'On - Day' })).toBeInTheDocument();
    expect(setMonthlyPattern).toHaveBeenCalledWith('day_of_month');
    expect(setDayOfMonth).toHaveBeenCalledWith('20');

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.getByRole('heading', { name: 'Recurring schedule' })).toBeInTheDocument();
  });
});
