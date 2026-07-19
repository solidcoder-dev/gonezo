import type { ViewProps } from '../../../shared/ui/ViewProps';
import type { MovementVoiceCapturePresentationState } from '../../application/MovementVoiceEntry/useMovementVoiceCaptureModel';

export type ExperimentalMovementDockNavigationItem = Readonly<{
  id: string;
  label: string;
  iconClassName: string;
}>;

export type ExperimentalMovementDockNavigationViewProps = ViewProps<
  {
    ariaLabel: string;
    addAriaLabel: string;
    microphoneAriaLabel: string;
    stopLockedAriaLabel: string;
    cancelVoiceAriaLabel?: string;
  },
  {
    items: ExperimentalMovementDockNavigationItem[];
  },
  {
    activeItemId: string;
    voiceCapture: MovementVoiceCapturePresentationState;
  },
  {
    disabled: boolean;
    addDisabled: boolean;
    navigationDimmed: boolean;
  },
  {
    selectItem(itemId: string): void;
    pressAdd(): void;
    retryVoiceCapture(): void;
    stopLockedRecording(): void;
    cancelVoicePipeline?: () => void;
    setMicrophoneButtonElement?: (element: HTMLButtonElement | null) => void;
    onVoicePointerDown: (gesture: { pointerId: number; clientX: number; clientY: number }) => Promise<void> | void;
    onVoicePointerMove: (gesture: { pointerId: number; clientX: number; clientY: number }) => Promise<void> | void;
    onVoicePointerUp: (gesture: { pointerId: number }) => Promise<void> | void;
    onVoicePointerCancel: (gesture: { pointerId: number }) => Promise<void> | void;
  }
>;
