import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MovementVoiceEntryView } from './MovementVoiceEntryView';
import type { MovementVoiceEntryViewProps } from './MovementVoiceEntryView.contract';

function makeProps(overrides: Partial<MovementVoiceEntryViewProps> = {}): MovementVoiceEntryViewProps {
  return {
    required: {
      config: {
        microphoneAriaLabel: 'Record movement with voice',
        stopLockedAriaLabel: 'Stop locked voice recording',
        cancelVoiceAriaLabel: 'Cancel voice processing',
      },
      data: {},
      state: {
        voiceCapture: {
          kind: 'idle',
          headline: 'Add movement',
          locked: false,
          busy: false,
        },
      },
      status: {},
      ...overrides.required,
    },
    provided: {
      commands: {
        retryVoiceCapture: vi.fn(),
        stopLockedRecording: vi.fn(),
        cancelVoicePipeline: vi.fn(),
        setMicrophoneButtonElement: vi.fn(),
        onVoicePointerDown: vi.fn(),
        onVoicePointerMove: vi.fn(),
        onVoicePointerUp: vi.fn(),
        onVoicePointerCancel: vi.fn(),
        ...overrides.provided?.commands,
      },
    },
  };
}

describe('MovementVoiceEntryView', () => {
  it('renders the idle and recording microphone affordances', () => {
    const { rerender } = render(<MovementVoiceEntryView {...makeProps()} />);

    expect(screen.getByRole('button', { name: 'Record movement with voice' })).toHaveClass('movement-voice-entry-microphone');
    expect(screen.getByRole('button', { name: 'Record movement with voice' })).toBeInTheDocument();
    expect(screen.queryByText('Add movement')).not.toBeInTheDocument();

    rerender(<MovementVoiceEntryView {...makeProps({
      required: {
        config: {
          microphoneAriaLabel: 'Record movement with voice',
          stopLockedAriaLabel: 'Stop locked voice recording',
        },
        data: {},
        state: {
          voiceCapture: {
            kind: 'recording',
            headline: '00:06',
            elapsedLabel: '00:06',
            locked: false,
            busy: false,
          },
        },
        status: {},
      },
    })} />);

    expect(screen.getByText('00:06')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop locked voice recording' })).toHaveClass('movement-voice-entry-microphone--recording');
  });

  it('forwards the pointer gestures to the corresponding voice commands', () => {
    const onVoicePointerDown = vi.fn();
    const onVoicePointerMove = vi.fn();
    const onVoicePointerUp = vi.fn();
    const onVoicePointerCancel = vi.fn();

    render(<MovementVoiceEntryView {...makeProps({
      provided: {
        commands: {
          retryVoiceCapture: vi.fn(),
          stopLockedRecording: vi.fn(),
          cancelVoicePipeline: vi.fn(),
          setMicrophoneButtonElement: vi.fn(),
          onVoicePointerDown,
          onVoicePointerMove,
          onVoicePointerUp,
          onVoicePointerCancel,
        },
      },
    })} />);

    const microphoneButton = screen.getByRole('button', { name: 'Record movement with voice' });

    fireEvent.pointerDown(microphoneButton, { pointerId: 4, clientX: 100, clientY: 120 });
    fireEvent.pointerMove(microphoneButton, { pointerId: 4, clientX: 110, clientY: 130 });
    fireEvent.pointerUp(microphoneButton, { pointerId: 4, clientX: 110, clientY: 130 });
    fireEvent.pointerCancel(microphoneButton, { pointerId: 4, clientX: 110, clientY: 130 });

    expect(onVoicePointerDown).toHaveBeenCalledWith({
      pointerId: 4,
      clientX: 100,
      clientY: 120,
    });
    expect(onVoicePointerMove).toHaveBeenCalledWith({
      pointerId: 4,
      clientX: 110,
      clientY: 130,
    });
    expect(onVoicePointerUp).toHaveBeenCalledWith({
      pointerId: 4,
    });
    expect(onVoicePointerCancel).toHaveBeenCalledWith({
      pointerId: 4,
    });
  });

  it('keeps retry available on failure and uses cancel voice processing while the pipeline is busy', () => {
    const retryVoiceCapture = vi.fn();
    const cancelVoicePipeline = vi.fn();

    render(<MovementVoiceEntryView {...makeProps({
      required: {
        config: {
          microphoneAriaLabel: 'Record movement with voice',
          stopLockedAriaLabel: 'Stop locked voice recording',
          cancelVoiceAriaLabel: 'Cancel voice processing',
        },
        data: {},
        state: {
          voiceCapture: {
            kind: 'failed',
            headline: 'Retry voice capture',
            errorMessage: 'The selected account is no longer available. Select an account and try again.',
            locked: false,
            busy: false,
          },
        },
        status: {},
      },
      provided: {
        commands: {
          retryVoiceCapture,
          stopLockedRecording: vi.fn(),
          cancelVoicePipeline,
          setMicrophoneButtonElement: vi.fn(),
          onVoicePointerDown: vi.fn(),
          onVoicePointerMove: vi.fn(),
          onVoicePointerUp: vi.fn(),
          onVoicePointerCancel: vi.fn(),
        },
      },
    })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Record movement with voice' }));
    expect(retryVoiceCapture).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Record movement with voice' })).toHaveAttribute('aria-invalid', 'true');

    render(<MovementVoiceEntryView {...makeProps({
      required: {
        config: {
          microphoneAriaLabel: 'Record movement with voice',
          stopLockedAriaLabel: 'Stop locked voice recording',
          cancelVoiceAriaLabel: 'Cancel voice processing',
        },
        data: {},
        state: {
          voiceCapture: {
            kind: 'processing',
            headline: 'Interpreting',
            locked: false,
            busy: true,
          },
        },
        status: {},
      },
      provided: {
        commands: {
          retryVoiceCapture: vi.fn(),
          stopLockedRecording: vi.fn(),
          cancelVoicePipeline,
          setMicrophoneButtonElement: vi.fn(),
          onVoicePointerDown: vi.fn(),
          onVoicePointerMove: vi.fn(),
          onVoicePointerUp: vi.fn(),
          onVoicePointerCancel: vi.fn(),
        },
      },
    })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel voice processing' }));
    expect(cancelVoicePipeline).toHaveBeenCalledTimes(1);
  });
});
