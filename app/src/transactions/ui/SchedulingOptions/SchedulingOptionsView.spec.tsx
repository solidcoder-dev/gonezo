import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SchedulingOptionsView } from './SchedulingOptionsView';

describe('SchedulingOptionsView', () => {
  it('renders timing and schedule type controls when scheduling is visible', () => {
    const setSchedulingMode = vi.fn();
    const setSchedulingKind = vi.fn();
    render(
      <SchedulingOptionsView
        required={{
          config: {},
          data: {},
          state: {
            schedulingMode: 'scheduled',
            schedulingKind: 'one_shot',
            scheduledMovementVisible: true,
          },
          status: { disabled: false },
        }}
        provided={{
          commands: {
            setSchedulingMode,
            setSchedulingKind,
          },
        }}
      />,
    );

    expect(screen.getByText('When should this movement be applied?')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Schedule' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'One-time' })).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('radio', { name: 'Now' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Recurring' }));

    expect(setSchedulingMode).toHaveBeenCalledWith('now');
    expect(setSchedulingKind).toHaveBeenCalledWith('recurring');
  });

  it('hides schedule type when scheduled movement controls are not visible', () => {
    render(
      <SchedulingOptionsView
        required={{
          config: {},
          data: {},
          state: {
            schedulingMode: 'now',
            schedulingKind: 'one_shot',
            scheduledMovementVisible: false,
          },
          status: { disabled: false },
        }}
        provided={{
          commands: {
            setSchedulingMode: vi.fn(),
            setSchedulingKind: vi.fn(),
          },
        }}
      />,
    );

    expect(screen.queryByRole('radio', { name: 'One-time' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Recurring' })).not.toBeInTheDocument();
  });
});
