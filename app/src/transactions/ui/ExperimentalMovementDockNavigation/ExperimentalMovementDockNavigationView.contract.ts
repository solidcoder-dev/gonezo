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
    microphoneDisabled: boolean;
    navigationDimmed: boolean;
  },
  {
    selectItem(itemId: string): void;
    pressAdd(): void;
    toggleCapture(): Promise<void> | void;
    retryVoiceCapture(): void;
    cancelVoicePipeline?: () => void;
    setMicrophoneButtonElement?: (element: HTMLButtonElement | null) => void;
  }
>;
