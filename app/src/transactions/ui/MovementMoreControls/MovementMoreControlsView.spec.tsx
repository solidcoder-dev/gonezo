import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MovementMoreSheetView } from './MovementMoreSheetView';
import { MovementMoreTriggerView } from './MovementMoreTriggerView';

describe('MovementMoreControlsView', () => {
  it('opens advanced actions from the interactive row and preserves disabled state', () => {
    const open = vi.fn();
    const { rerender } = render(
      <MovementMoreTriggerView
        required={{ config: {}, data: {}, state: {}, status: { disabled: false } }}
        provided={{ commands: { open } }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /MoreAdvanced actions/i }));
    expect(open).toHaveBeenCalledTimes(1);

    rerender(
      <MovementMoreTriggerView
        required={{ config: {}, data: {}, state: {}, status: { disabled: true } }}
        provided={{ commands: { open } }}
      />,
    );
    expect(screen.getByRole('button', { name: /MoreAdvanced actions/i })).toBeDisabled();
  });

  it('renders Done as the primary action and keeps the switch callback', () => {
    const done = vi.fn();
    const setIgnored = vi.fn();

    render(
      <MovementMoreSheetView
        required={{ config: {}, data: {}, state: { ignored: false }, status: { disabled: false } }}
        provided={{ commands: { done, setIgnored } }}
      />,
    );

    fireEvent.click(screen.getByRole('switch', { name: 'Ignore movement' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(setIgnored).toHaveBeenCalledWith(true);
    expect(done).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Done' })).toHaveClass('btn-primary');
  });
});
