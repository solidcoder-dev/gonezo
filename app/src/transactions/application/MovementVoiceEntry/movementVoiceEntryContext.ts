import type { AppLifecyclePort } from './AppLifecyclePort';
import type { MicrophonePermissionPort } from './MicrophonePermissionPort';
import type { CaptureVoiceInputPort } from './CaptureVoiceInput';
import type { TranscribeVoiceInputPort } from './TranscribeVoiceInput';
import type { MovementEntryDraftInterpreterPort } from './MovementEntryDraftInterpreterPort';
import type { InterpretationRunExporterPort } from './InterpretationRunExporterPort';
import type { MovementVoiceEntryCategorySourcePort } from './MovementVoiceEntryCategorySourcePort';

export type MovementVoiceEntryContext = {
  enabled: boolean;
  captureVoiceInput: CaptureVoiceInputPort;
  transcribeVoiceInput: TranscribeVoiceInputPort;
  interpretMovementEntryDraft: MovementEntryDraftInterpreterPort;
  interpretationRunExporter?: InterpretationRunExporterPort;
  microphonePermission: MicrophonePermissionPort;
  appLifecycle?: AppLifecyclePort;
  categorySource: MovementVoiceEntryCategorySourcePort;
};
