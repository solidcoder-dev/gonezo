import type { PointerEventHandler } from 'react';
import type { ViewProps } from '../../../shared/ui/ViewProps';
import type { MovementVoiceCapturePresentationState } from '../../application/MovementVoiceEntry/useMovementVoiceCaptureModel';

export type MovementDockNavigationItemView = {
  id: string;
  label: string;
  iconClassName: string;
};

export type MovementDockNavigationViewProps = ViewProps<
  {
    ariaLabel: string;
    addAriaLabel: string;
    microphoneAriaLabel: string;
    stopLockedAriaLabel: string;
    cancelVoiceAriaLabel?: string;
  },
  {
    items: MovementDockNavigationItemView[];
  },
  {
    activeItemId: string;
    voiceCapture: MovementVoiceCapturePresentationState;
  },
  {
    disabled?: boolean;
    addDisabled?: boolean;
    navigationDimmed?: boolean;
  },
  {
    selectItem: (itemId: string) => void;
    pressAdd: () => void;
    retryVoiceCapture: () => void;
    stopLockedRecording: () => void;
    cancelVoicePipeline?: () => void;
    setMicrophoneButtonElement?: (element: HTMLButtonElement | null) => void;
    onVoicePointerDown: PointerEventHandler<HTMLButtonElement>;
    onVoicePointerMove: PointerEventHandler<HTMLButtonElement>;
    onVoicePointerUp: PointerEventHandler<HTMLButtonElement>;
    onVoicePointerCancel: PointerEventHandler<HTMLButtonElement>;
  }
>;
