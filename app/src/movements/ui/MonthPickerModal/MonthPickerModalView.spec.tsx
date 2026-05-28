import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MonthPickerModalView } from './MonthPickerModalView';

describe('MonthPickerModalView', () => {
  it('does not render dialog when closed', () => {
    render(
      <MonthPickerModalView
        required={{
          open: false,
        }}
        provided={{
          onDismiss: vi.fn(),
        }}
      >
        <div>Picker content</div>
      </MonthPickerModalView>,
    );

    expect(screen.queryByRole('dialog', { name: 'Choose month' })).not.toBeInTheDocument();
  });

  it('renders dialog when open and closes on backdrop and escape', () => {
    const onDismiss = vi.fn();

    render(
      <MonthPickerModalView
        required={{
          open: true,
        }}
        provided={{
          onDismiss,
        }}
      >
        <div>Picker content</div>
      </MonthPickerModalView>,
    );

    expect(screen.getByRole('dialog', { name: 'Choose month' })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Close month picker'));
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onDismiss).toHaveBeenCalledTimes(2);
  });
});
