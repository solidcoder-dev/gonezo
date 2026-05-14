import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControlView } from './SegmentedControlView';

describe('SegmentedControlView', () => {
  it('renders radio-style segment options and reports selection', () => {
    const select = vi.fn();
    render(
      <SegmentedControlView
        required={{
          config: { ariaLabel: 'Movement timing', columns: 2 },
          data: {
            options: [
              { value: 'now', label: 'Now' },
              { value: 'scheduled', label: 'Schedule' },
            ],
          },
          state: { value: 'now' },
          status: { disabled: false },
        }}
        provided={{ commands: { select } }}
      />,
    );

    expect(screen.getByRole('radiogroup', { name: 'Movement timing' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Now' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Schedule' })).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(screen.getByRole('radio', { name: 'Schedule' }));
    expect(select).toHaveBeenCalledWith('scheduled');
  });

  it('does not select disabled options', () => {
    const select = vi.fn();
    render(
      <SegmentedControlView
        required={{
          config: { ariaLabel: 'Sort direction', columns: 2 },
          data: {
            options: [
              { value: 'desc', label: 'Descending' },
              { value: 'asc', label: 'Ascending', disabled: true },
            ],
          },
          state: { value: 'desc' },
          status: { disabled: false },
        }}
        provided={{ commands: { select } }}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Ascending' }));
    expect(select).not.toHaveBeenCalled();
  });
});
