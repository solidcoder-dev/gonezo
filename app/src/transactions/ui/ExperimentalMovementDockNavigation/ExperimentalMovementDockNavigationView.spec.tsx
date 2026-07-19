import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExperimentalMovementDockNavigationView } from './ExperimentalMovementDockNavigationView';
import type { ExperimentalMovementDockNavigationViewProps } from './ExperimentalMovementDockNavigationView.contract';

function makeProps(overrides: Partial<ExperimentalMovementDockNavigationViewProps> = {}): ExperimentalMovementDockNavigationViewProps {
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
      status: {
        disabled: false,
        addDisabled: false,
        navigationDimmed: false,
      },
      ...overrides.required,
    },
    provided: {
      commands: {
        selectItem: vi.fn(),
        pressAdd: vi.fn(),
        retryVoiceCapture: vi.fn(),
        stopLockedRecording: vi.fn(),
        cancelVoicePipeline: vi.fn(),
        setMicrophoneButtonElement: vi.fn(),
        onVoicePointerDown: vi.fn(),
        onVoicePointerMove: vi.fn(),
        onVoicePointerUp: vi.fn(),
        onVoicePointerCancel: vi.fn(),
      },
      ...overrides.provided,
    },
  };
}

describe('ExperimentalMovementDockNavigationView', () => {
  it('renders the experimental dock with left and right route groups', () => {
    render(<ExperimentalMovementDockNavigationView {...makeProps()} />);

    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Home' })).toHaveClass('movement-dock-item--active');
    expect(screen.getByRole('button', { name: 'Add movement' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record movement with voice' })).toBeInTheDocument();
  });

  it('dispatches add and navigation commands', () => {
    const selectItem = vi.fn();
    const pressAdd = vi.fn();
    render(<ExperimentalMovementDockNavigationView {...makeProps({
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

  it('keeps the microphone on the existing stop affordance while recording', () => {
    render(<ExperimentalMovementDockNavigationView {...makeProps({
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
          disabled: true,
          addDisabled: true,
          navigationDimmed: true,
        },
      },
    })} />);

    expect(screen.getByText('00:06')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop locked voice recording' })).toBeInTheDocument();
  });
});
