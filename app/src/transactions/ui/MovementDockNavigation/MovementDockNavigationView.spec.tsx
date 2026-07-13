import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MovementDockNavigationView } from './MovementDockNavigationView';
import type { MovementDockNavigationViewProps } from './MovementDockNavigationView.contract';

function makeProps(overrides: Partial<MovementDockNavigationViewProps> = {}): MovementDockNavigationViewProps {
  return {
    required: {
      config: {
        ariaLabel: 'Primary navigation',
        addAriaLabel: 'Add movement',
        microphoneAriaLabel: 'Record movement with voice',
        stopLockedAriaLabel: 'Stop locked voice recording',
        cancelVoiceAriaLabel: 'Cancel voice processing',
      },
      data: {
        items: [
          { id: 'home', label: 'Home', iconClassName: 'bi bi-house-door' },
          { id: 'analytics', label: 'Analytics', iconClassName: 'bi bi-bar-chart-line' },
          { id: 'movements', label: 'Movements', iconClassName: 'bi bi-receipt' },
          { id: 'profile', label: 'Profile', iconClassName: 'bi bi-person' },
        ],
      },
      state: {
        activeItemId: 'home',
        voiceCapture: {
          kind: 'idle',
          headline: 'Add movement',
          supportingText: 'Hold the microphone to record a voice draft.',
          locked: false,
          busy: false,
        },
      },
      status: {},
      ...overrides.required,
    },
    provided: {
      commands: {
        selectItem: vi.fn(),
        pressAdd: vi.fn(),
        retryVoiceCapture: vi.fn(),
        stopLockedRecording: vi.fn(),
        cancelVoicePipeline: vi.fn(),
        onVoicePointerDown: vi.fn(),
        onVoicePointerMove: vi.fn(),
        onVoicePointerUp: vi.fn(),
        onVoicePointerCancel: vi.fn(),
      },
      ...overrides.provided,
    },
  };
}

describe('MovementDockNavigationView', () => {
  it('renders the visible navigation labels and central actions', () => {
    render(<MovementDockNavigationView {...makeProps()} />);

    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Home' })).toHaveClass('movement-dock-item--active');
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add movement' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record movement with voice' })).toBeInTheDocument();
  });

  it('dispatches manual add and navigation commands', () => {
    const selectItem = vi.fn();
    const pressAdd = vi.fn();
    render(<MovementDockNavigationView {...makeProps({
      provided: {
        commands: {
          selectItem,
          pressAdd,
          retryVoiceCapture: vi.fn(),
          stopLockedRecording: vi.fn(),
          onVoicePointerDown: vi.fn(),
          onVoicePointerMove: vi.fn(),
          onVoicePointerUp: vi.fn(),
          onVoicePointerCancel: vi.fn(),
        },
      },
    })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Movements' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add movement' }));

    expect(selectItem).toHaveBeenCalledWith('movements');
    expect(pressAdd).toHaveBeenCalledTimes(1);
  });

  it('renders the recording state with timer and stop affordance', () => {
    render(<MovementDockNavigationView {...makeProps({
      required: {
        config: {
          ariaLabel: 'Primary navigation',
          addAriaLabel: 'Add movement',
          microphoneAriaLabel: 'Record movement with voice',
          stopLockedAriaLabel: 'Stop locked voice recording',
        },
        data: {
          items: [
            { id: 'home', label: 'Home', iconClassName: 'bi bi-house-door' },
            { id: 'analytics', label: 'Analytics', iconClassName: 'bi bi-bar-chart-line' },
            { id: 'movements', label: 'Movements', iconClassName: 'bi bi-receipt' },
            { id: 'profile', label: 'Profile', iconClassName: 'bi bi-person' },
          ],
        },
        state: {
          activeItemId: 'home',
          voiceCapture: {
            kind: 'recording',
            headline: '00:06',
            elapsedLabel: '00:06',
            locked: false,
            busy: false,
          },
        },
        status: {
          navigationDimmed: true,
        },
      },
    })} />);

    expect(screen.getByText('00:06')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop locked voice recording' })).toBeInTheDocument();
  });

  it('renders only the spinner and cancel action while stopping the pipeline', () => {
    const cancelVoicePipeline = vi.fn();
    render(<MovementDockNavigationView {...makeProps({
      required: {
        config: {
          ariaLabel: 'Primary navigation',
          addAriaLabel: 'Add movement',
          microphoneAriaLabel: 'Record movement with voice',
          stopLockedAriaLabel: 'Stop locked voice recording',
          cancelVoiceAriaLabel: 'Cancel voice processing',
        },
        data: {
          items: [
            { id: 'home', label: 'Home', iconClassName: 'bi bi-house-door' },
            { id: 'analytics', label: 'Analytics', iconClassName: 'bi bi-bar-chart-line' },
            { id: 'movements', label: 'Movements', iconClassName: 'bi bi-receipt' },
            { id: 'profile', label: 'Profile', iconClassName: 'bi bi-person' },
          ],
        },
        state: {
          activeItemId: 'home',
          voiceCapture: {
            kind: 'processing',
            headline: 'Interpreting',
            supportingText: 'This should not be visible.',
            locked: false,
            busy: true,
          },
        },
        status: {},
      },
      provided: {
        commands: {
          selectItem: vi.fn(),
          pressAdd: vi.fn(),
          retryVoiceCapture: vi.fn(),
          stopLockedRecording: vi.fn(),
          cancelVoicePipeline,
          onVoicePointerDown: vi.fn(),
          onVoicePointerMove: vi.fn(),
          onVoicePointerUp: vi.fn(),
          onVoicePointerCancel: vi.fn(),
        },
      },
    })} />);

    expect(screen.queryByText('Interpreting')).not.toBeInTheDocument();
    expect(screen.queryByText('This should not be visible.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel voice processing' }));
    expect(cancelVoicePipeline).toHaveBeenCalledTimes(1);
  });

  it('allows stopping from the recording action button', () => {
    const stopLockedRecording = vi.fn();
    const onVoicePointerDown = vi.fn();
    render(<MovementDockNavigationView {...makeProps({
      required: {
        config: {
          ariaLabel: 'Primary navigation',
          addAriaLabel: 'Add movement',
          microphoneAriaLabel: 'Record movement with voice',
          stopLockedAriaLabel: 'Stop locked voice recording',
        },
        data: {
          items: [
            { id: 'home', label: 'Home', iconClassName: 'bi bi-house-door' },
            { id: 'analytics', label: 'Analytics', iconClassName: 'bi bi-bar-chart-line' },
            { id: 'movements', label: 'Movements', iconClassName: 'bi bi-receipt' },
            { id: 'profile', label: 'Profile', iconClassName: 'bi bi-person' },
          ],
        },
        state: {
          activeItemId: 'home',
          voiceCapture: {
            kind: 'recording',
            headline: '00:12',
            elapsedLabel: '00:12',
            locked: false,
            busy: false,
          },
        },
        status: {},
      },
      provided: {
        commands: {
          selectItem: vi.fn(),
          pressAdd: vi.fn(),
          retryVoiceCapture: vi.fn(),
          stopLockedRecording,
          onVoicePointerDown,
          onVoicePointerMove: vi.fn(),
          onVoicePointerUp: vi.fn(),
          onVoicePointerCancel: vi.fn(),
        },
      },
    })} />);

    const stopButton = screen.getByRole('button', { name: 'Stop locked voice recording' });
    fireEvent.pointerDown(stopButton, { pointerId: 2, clientX: 100, clientY: 100 });
    fireEvent.click(stopButton);

    expect(stopLockedRecording).toHaveBeenCalledTimes(1);
    expect(onVoicePointerDown).toHaveBeenCalledTimes(1);
  });

  it('does not stop recording from the same click that started the gesture', () => {
    const stopLockedRecording = vi.fn();
    const onVoicePointerDown = vi.fn();
    const onVoicePointerUp = vi.fn();
    const { rerender } = render(<MovementDockNavigationView {...makeProps({
      provided: {
        commands: {
          selectItem: vi.fn(),
          pressAdd: vi.fn(),
          retryVoiceCapture: vi.fn(),
          stopLockedRecording,
          onVoicePointerDown,
          onVoicePointerMove: vi.fn(),
          onVoicePointerUp,
          onVoicePointerCancel: vi.fn(),
        },
      },
    })} />);

    const microphoneButton = screen.getByRole('button', { name: 'Record movement with voice' });
    fireEvent.pointerDown(microphoneButton, { pointerId: 1, clientX: 100, clientY: 100 });

    rerender(<MovementDockNavigationView {...makeProps({
      required: {
        config: {
          ariaLabel: 'Primary navigation',
          addAriaLabel: 'Add movement',
          microphoneAriaLabel: 'Record movement with voice',
          stopLockedAriaLabel: 'Stop locked voice recording',
        },
        data: {
          items: [
            { id: 'home', label: 'Home', iconClassName: 'bi bi-house-door' },
            { id: 'analytics', label: 'Analytics', iconClassName: 'bi bi-bar-chart-line' },
            { id: 'movements', label: 'Movements', iconClassName: 'bi bi-receipt' },
            { id: 'profile', label: 'Profile', iconClassName: 'bi bi-person' },
          ],
        },
        state: {
          activeItemId: 'home',
          voiceCapture: {
            kind: 'recording',
            headline: '00:01',
            elapsedLabel: '00:01',
            locked: false,
            busy: false,
          },
        },
        status: {},
      },
      provided: {
        commands: {
          selectItem: vi.fn(),
          pressAdd: vi.fn(),
          retryVoiceCapture: vi.fn(),
          stopLockedRecording,
          onVoicePointerDown,
          onVoicePointerMove: vi.fn(),
          onVoicePointerUp,
          onVoicePointerCancel: vi.fn(),
        },
      },
    })} />);

    const recordingMicrophoneButton = screen.getByRole('button', { name: 'Stop locked voice recording' });
    fireEvent.pointerUp(recordingMicrophoneButton, { pointerId: 1 });
    fireEvent.click(recordingMicrophoneButton);

    expect(stopLockedRecording).not.toHaveBeenCalled();
    expect(onVoicePointerDown).toHaveBeenCalledTimes(1);
    expect(onVoicePointerUp).toHaveBeenCalledTimes(1);
  });

  it('allows stopping an explicitly locked recording', () => {
    const stopLockedRecording = vi.fn();
    render(<MovementDockNavigationView {...makeProps({
      required: {
        config: {
          ariaLabel: 'Primary navigation',
          addAriaLabel: 'Add movement',
          microphoneAriaLabel: 'Record movement with voice',
          stopLockedAriaLabel: 'Stop locked voice recording',
        },
        data: {
          items: [
            { id: 'home', label: 'Home', iconClassName: 'bi bi-house-door' },
            { id: 'analytics', label: 'Analytics', iconClassName: 'bi bi-bar-chart-line' },
            { id: 'movements', label: 'Movements', iconClassName: 'bi bi-receipt' },
            { id: 'profile', label: 'Profile', iconClassName: 'bi bi-person' },
          ],
        },
        state: {
          activeItemId: 'home',
          voiceCapture: {
            kind: 'locked',
            headline: '00:12',
            elapsedLabel: '00:12',
            locked: true,
            busy: false,
          },
        },
        status: {},
      },
      provided: {
        commands: {
          selectItem: vi.fn(),
          pressAdd: vi.fn(),
          retryVoiceCapture: vi.fn(),
          stopLockedRecording,
          onVoicePointerDown: vi.fn(),
          onVoicePointerMove: vi.fn(),
          onVoicePointerUp: vi.fn(),
          onVoicePointerCancel: vi.fn(),
        },
      },
    })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Stop locked voice recording' }));

    expect(stopLockedRecording).toHaveBeenCalledTimes(1);
  });

  it('keeps the microphone button mounted across the recording transition', () => {
    const { rerender } = render(<MovementDockNavigationView {...makeProps()} />);

    const idleMicrophoneButton = screen.getByRole('button', { name: 'Record movement with voice' });

    rerender(<MovementDockNavigationView {...makeProps({
      required: {
        config: {
          ariaLabel: 'Primary navigation',
          addAriaLabel: 'Add movement',
          microphoneAriaLabel: 'Record movement with voice',
          stopLockedAriaLabel: 'Stop locked voice recording',
        },
        data: {
          items: [
            { id: 'home', label: 'Home', iconClassName: 'bi bi-house-door' },
            { id: 'analytics', label: 'Analytics', iconClassName: 'bi bi-bar-chart-line' },
            { id: 'movements', label: 'Movements', iconClassName: 'bi bi-receipt' },
            { id: 'profile', label: 'Profile', iconClassName: 'bi bi-person' },
          ],
        },
        state: {
          activeItemId: 'home',
          voiceCapture: {
            kind: 'recording',
            headline: '00:10',
            elapsedLabel: '00:10',
            locked: false,
            busy: false,
          },
        },
        status: {},
      },
    })} />);

    const recordingMicrophoneButton = screen.getByRole('button', { name: 'Stop locked voice recording' });

    expect(recordingMicrophoneButton).toBe(idleMicrophoneButton);
  });

  it('keeps the composer review state visible after draft interpretation completes', () => {
    render(<MovementDockNavigationView {...makeProps({
      required: {
        config: {
          ariaLabel: 'Primary navigation',
          addAriaLabel: 'Add movement',
          microphoneAriaLabel: 'Record movement with voice',
          stopLockedAriaLabel: 'Stop locked voice recording',
        },
        data: {
          items: [
            { id: 'home', label: 'Home', iconClassName: 'bi bi-house-door' },
            { id: 'analytics', label: 'Analytics', iconClassName: 'bi bi-bar-chart-line' },
            { id: 'movements', label: 'Movements', iconClassName: 'bi bi-receipt' },
            { id: 'profile', label: 'Profile', iconClassName: 'bi bi-person' },
          ],
        },
        state: {
          activeItemId: 'home',
          voiceCapture: {
            kind: 'draft-ready',
            headline: 'Draft ready',
            supportingText: 'Review the movement composer.',
            locked: false,
            busy: true,
          },
        },
        status: {},
      },
    })} />);

    expect(screen.getByText('Draft ready')).toBeInTheDocument();
    expect(screen.getByText('Review the movement composer.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record movement with voice' })).toBeInTheDocument();
  });

  it('marks the microphone as invalid and keeps retry available after a failure', () => {
    const retryVoiceCapture = vi.fn();
    const { container } = render(<MovementDockNavigationView {...makeProps({
      required: {
        config: {
          ariaLabel: 'Primary navigation',
          addAriaLabel: 'Add movement',
          microphoneAriaLabel: 'Record movement with voice',
          stopLockedAriaLabel: 'Stop locked voice recording',
        },
        data: {
          items: [
            { id: 'home', label: 'Home', iconClassName: 'bi bi-house-door' },
            { id: 'analytics', label: 'Analytics', iconClassName: 'bi bi-bar-chart-line' },
            { id: 'movements', label: 'Movements', iconClassName: 'bi bi-receipt' },
            { id: 'profile', label: 'Profile', iconClassName: 'bi bi-person' },
          ],
        },
        state: {
          activeItemId: 'home',
          voiceCapture: {
            kind: 'failed',
            headline: 'Retry voice capture',
            supportingText: 'Tap the microphone again after fixing access or recording issues.',
            errorMessage: 'The selected account is no longer available. Select an account and try again.',
            locked: false,
            busy: false,
          },
        },
        status: {},
      },
      provided: {
        commands: {
          selectItem: vi.fn(),
          pressAdd: vi.fn(),
          retryVoiceCapture,
          stopLockedRecording: vi.fn(),
          onVoicePointerDown: vi.fn(),
          onVoicePointerMove: vi.fn(),
          onVoicePointerUp: vi.fn(),
          onVoicePointerCancel: vi.fn(),
        },
      },
    })} />);

    const microphoneButton = screen.getByRole('button', { name: 'Record movement with voice' });

    expect(microphoneButton).toHaveAttribute('aria-invalid', 'true');
    expect(container.querySelector('.movement-dock-capsule--failed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Export diagnostics' })).not.toBeInTheDocument();
    expect(screen.queryByText('Tap the microphone again after fixing access or recording issues.')).not.toBeInTheDocument();

    fireEvent.click(microphoneButton);

    expect(retryVoiceCapture).toHaveBeenCalledTimes(1);
  });

  it('keeps the failed dock compact without diagnostics actions', () => {
    const { container } = render(<MovementDockNavigationView {...makeProps({
      required: {
        config: {
          ariaLabel: 'Primary navigation',
          addAriaLabel: 'Add movement',
          microphoneAriaLabel: 'Record movement with voice',
          stopLockedAriaLabel: 'Stop locked voice recording',
        },
        data: {
          items: [
            { id: 'home', label: 'Home', iconClassName: 'bi bi-house-door' },
            { id: 'analytics', label: 'Analytics', iconClassName: 'bi bi-bar-chart-line' },
            { id: 'movements', label: 'Movements', iconClassName: 'bi bi-receipt' },
            { id: 'profile', label: 'Profile', iconClassName: 'bi bi-person' },
          ],
        },
        state: {
          activeItemId: 'home',
          voiceCapture: {
            kind: 'failed',
            headline: 'Retry voice capture',
            supportingText: 'Tap the microphone again after fixing access or recording issues.',
            errorMessage: 'The selected account is no longer available. Select an account and try again.',
            locked: false,
            busy: false,
          },
        },
        status: {},
      },
    })} />);

    expect(container.querySelector('.movement-dock-capsule--failed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Export diagnostics' })).not.toBeInTheDocument();
    expect(screen.queryByText('Tap the microphone again after fixing access or recording issues.')).not.toBeInTheDocument();
  });
});
