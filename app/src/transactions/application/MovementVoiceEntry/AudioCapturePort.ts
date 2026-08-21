import type { CapturedAudio, RecordingSession } from './movementVoiceCapture.types';
import type { TranscriptionSettings } from './TranscriptionSettings';

export interface AudioCapturePort {
  start(settings?: TranscriptionSettings): Promise<RecordingSession>;
  stop(): Promise<CapturedAudio>;
  cancel(): Promise<void>;
  discardRun(runId: string): Promise<void>;
}
