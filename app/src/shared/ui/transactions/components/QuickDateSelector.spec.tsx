import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuickDateSelector } from './QuickDateSelector';

describe('QuickDateSelector', () => {
  it('triggers quick actions and date change', () => {
    const onToday = vi.fn();
    const onYesterday = vi.fn();
    const onChangeDate = vi.fn();

    render(
      <QuickDateSelector
        required={{
          date: '2026-03-08',
          disabled: false,
        }}
        provided={{
          onToday,
          onYesterday,
          onChangeDate,
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yesterday' }));
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-03-07' } });

    expect(onToday).toHaveBeenCalledTimes(1);
    expect(onYesterday).toHaveBeenCalledTimes(1);
    expect(onChangeDate).toHaveBeenCalledWith('2026-03-07');
  });
});
