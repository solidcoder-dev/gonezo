import type { ViewProps } from '../../../shared/ui/ViewProps';
import type { MovementVoiceCapturePresentationState } from '../../application/MovementVoiceEntry/useMovementVoiceCaptureModel';

export type MovementVoiceEntryViewProps = ViewProps<
  {
    microphoneAriaLabel: string;
    stopLockedAriaLabel: string;
    cancelVoiceAriaLabel?: string;
  },
  Record<string, never>,
  {
    voiceCapture: MovementVoiceCapturePresentationState;
  },
  Record<string, never>,
  {
    retryVoiceCapture: () => void;
    stopLockedRecording: () => void;
    cancelVoicePipeline?: () => void;
    setMicrophoneButtonElement?: (element: HTMLButtonElement | null) => void;
    onVoicePointerDown: (gesture: { pointerId: number; clientX: number; clientY: number }) => Promise<void> | void;
    onVoicePointerMove: (gesture: { pointerId: number; clientX: number; clientY: number }) => Promise<void> | void;
    onVoicePointerUp: (gesture: { pointerId: number }) => Promise<void> | void;
    onVoicePointerCancel: (gesture: { pointerId: number }) => Promise<void> | void;
  }
>;
