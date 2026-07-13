import type { CapturedAudio, RecordingSession } from './movementVoiceCapture.types';

export interface AudioCapturePort {
  start(): Promise<RecordingSession>;
  stop(): Promise<CapturedAudio>;
  cancel(): Promise<void>;
  discardRun(runId: string): Promise<void>;
}
