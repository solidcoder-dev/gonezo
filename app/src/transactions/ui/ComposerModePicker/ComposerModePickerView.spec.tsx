import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ComposerModePickerView } from './ComposerModePickerView';

describe('ComposerModePickerView', () => {
  it('renders movement mode actions and reports the selected mode', () => {
    const selectMode = vi.fn();
    render(
      <ComposerModePickerView
        required={{
          config: {},
          data: {},
          state: {},
          status: { disabled: false },
        }}
        provided={{ commands: { selectMode } }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Expense' }));
    fireEvent.click(screen.getByRole('button', { name: 'Income' }));
    fireEvent.click(screen.getByRole('button', { name: 'Transfer' }));

    expect(screen.getByRole('button', { name: 'Expense' })).toHaveClass('mode-button--expense');
    expect(screen.getByRole('button', { name: 'Income' })).toHaveClass('mode-button--income');
    expect(screen.getByRole('button', { name: 'Transfer' })).toHaveClass('mode-button--transfer');
    expect(screen.getByRole('button', { name: 'Expense' }).querySelector('.bi-arrow-down-left')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Income' }).querySelector('.bi-arrow-up-right')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Transfer' }).querySelector('.bi-arrow-left-right')).not.toBeNull();
    expect(selectMode).toHaveBeenNthCalledWith(1, 'expense');
    expect(selectMode).toHaveBeenNthCalledWith(2, 'income');
    expect(selectMode).toHaveBeenNthCalledWith(3, 'transfer');
  });

  it('disables every mode action when status is disabled', () => {
    render(
      <ComposerModePickerView
        required={{
          config: {},
          data: {},
          state: {},
          status: { disabled: true },
        }}
        provided={{ commands: { selectMode: vi.fn() } }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Expense' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Income' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Transfer' })).toBeDisabled();
  });
});
