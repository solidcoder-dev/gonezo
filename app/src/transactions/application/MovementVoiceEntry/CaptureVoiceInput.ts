import type { AudioCapturePort } from './AudioCapturePort';
import { AudioCaptureError, type RecordingSession, type CapturedAudio } from './movementVoiceCapture.types';
import type { TranscriptionSettings } from './TranscriptionSettings';

export interface CaptureVoiceInputPort {
  start(settings?: TranscriptionSettings): Promise<RecordingSession>;
  stop(): Promise<CapturedAudio>;
  cancel(): Promise<void>;
  discardRun(runId: string): Promise<void>;
}

export class CaptureVoiceInput implements CaptureVoiceInputPort {
  private readonly audioCapture: AudioCapturePort;
  private readonly transcriptionSettings?: TranscriptionSettings;
  private activeSession: RecordingSession | null = null;

  constructor(audioCapture: AudioCapturePort, transcriptionSettings?: TranscriptionSettings) {
    this.audioCapture = audioCapture;
    this.transcriptionSettings = transcriptionSettings;
  }

  async start(): Promise<RecordingSession> {
    if (this.activeSession) {
      throw new AudioCaptureError({ code: 'recording-already-active', message: 'Voice capture is already active.' });
    }
    const session = await this.audioCapture.start(this.transcriptionSettings);
    this.activeSession = session;
    return session;
  }

  async stop(): Promise<CapturedAudio> {
    if (!this.activeSession) {
      throw new AudioCaptureError({ code: 'no-active-recording', message: 'No voice capture is active.' });
    }
    this.activeSession = null;
    return this.audioCapture.stop();
  }

  async cancel(): Promise<void> {
    if (!this.activeSession) {
      return;
    }
    try {
      await this.audioCapture.cancel();
    } finally {
      this.activeSession = null;
    }
  }

  async discardRun(runId: string): Promise<void> {
    if (this.activeSession?.runId === runId) {
      this.activeSession = null;
    }
    await this.audioCapture.discardRun(runId);
  }
}
