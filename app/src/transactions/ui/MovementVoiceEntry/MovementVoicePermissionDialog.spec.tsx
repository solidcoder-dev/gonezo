import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MovementVoicePermissionDialog } from './MovementVoicePermissionDialog';

describe('MovementVoicePermissionDialog', () => {
  it('renders an accessible modal dialog and focuses the safe dismiss action', () => {
    render(
      <MovementVoicePermissionDialog
        open
        title="Use your microphone"
        description="Gonezo needs microphone access to record a voice draft. During this version, the audio stays on this device."
        dismissActionLabel="Not now"
        safeActionLabel="Allow and record"
        onDismiss={vi.fn()}
        onSafeAction={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Use your microphone' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription(
      'Gonezo needs microphone access to record a voice draft. During this version, the audio stays on this device.',
    );
    expect(screen.getByRole('button', { name: 'Not now' })).toHaveFocus();
  });

  it('traps focus and closes on Escape', () => {
    const onDismiss = vi.fn();
    render(
      <MovementVoicePermissionDialog
        open
        title="Use your microphone"
        description="Gonezo needs microphone access to record a voice draft. During this version, the audio stays on this device."
        dismissActionLabel="Not now"
        safeActionLabel="Allow and record"
        onDismiss={onDismiss}
        onSafeAction={vi.fn()}
      />,
    );

    const dismissButton = screen.getByRole('button', { name: 'Not now' });
    const allowButton = screen.getByRole('button', { name: 'Allow and record' });

    dismissButton.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(allowButton).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('restores focus to the microphone trigger when it closes', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);

    const { rerender } = render(
      <MovementVoicePermissionDialog
        open
        title="Microphone access is off"
        description="Enable microphone access in Android settings to record a voice draft."
        dismissActionLabel="Cancel"
        safeActionLabel="Open settings"
        restoreFocusTo={{ current: trigger }}
        onDismiss={vi.fn()}
        onSafeAction={vi.fn()}
      />,
    );

    rerender(
      <MovementVoicePermissionDialog
        open={false}
        title="Microphone access is off"
        description="Enable microphone access in Android settings to record a voice draft."
        dismissActionLabel="Cancel"
        safeActionLabel="Open settings"
        restoreFocusTo={{ current: trigger }}
        onDismiss={vi.fn()}
        onSafeAction={vi.fn()}
      />,
    );

    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
