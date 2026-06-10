import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScheduleSummaryView } from './ScheduleSummaryView';
import { ScheduleTriggerView } from './ScheduleTriggerView';

describe('ScheduleControlsView', () => {
  it('opens recurring schedule from the trigger', () => {
    const open = vi.fn();

    render(
      <ScheduleTriggerView
        required={{
          config: {},
          data: {},
          state: {},
          status: {},
        }}
        provided={{ commands: { open } }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /schedule recurring/i }));

    expect(open).toHaveBeenCalledTimes(1);
  });

  it('shows schedule summary and exposes edit and remove actions', () => {
    const edit = vi.fn();
    const remove = vi.fn();

    render(
      <ScheduleSummaryView
        required={{
          config: {},
          data: {},
          state: {
            summary: 'Monthly · day 10',
            nextDate: '2026-06-10',
          },
          status: {},
        }}
        provided={{ commands: { edit, remove } }}
      />,
    );

    expect(screen.getByText('Monthly · day 10')).toBeInTheDocument();
    expect(screen.getByText('Next: 2026-06-10')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /edit schedule/i }));
    fireEvent.click(screen.getByRole('button', { name: /remove schedule/i }));

    expect(edit).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
