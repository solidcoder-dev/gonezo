import { WebPlugin } from '@capacitor/core';
import type {
  AudioCapturePluginPermissionResult,
  AudioCapturePlugin,
  AudioCapturePluginResult,
  AudioCapturePluginSession,
  AudioCapturePluginDiscardRunInput,
} from './audioCapturePlugin';

function unsupportedError() {
  return { code: 'unsupported-device', message: 'Voice capture is only available on Android right now.' };
}

export class AudioCapturePluginWeb extends WebPlugin implements AudioCapturePlugin {
  private activeSession: AudioCapturePluginSession | null = null;
  private nextRunIndex = 1;

  async getMicrophonePermissionStatus(): Promise<AudioCapturePluginPermissionResult> {
    throw unsupportedError();
  }

  async requestMicrophonePermission(): Promise<AudioCapturePluginPermissionResult> {
    throw unsupportedError();
  }

  async openAppSettings(): Promise<void> {
    throw unsupportedError();
  }

  async startRecording(): Promise<AudioCapturePluginSession> {
    if (this.activeSession) {
      throw { code: 'recording-already-active', message: 'A voice recording is already active.' };
    }
    const runIndex = this.nextRunIndex++;
    const runId = this.createRunId(runIndex);
    const session = {
      runId,
      startedAt: runIndex * 1_000,
    };
    this.activeSession = session;
    return session;
  }

  async stopRecording(): Promise<AudioCapturePluginResult> {
    const session = this.activeSession;
    if (!session) {
      throw { code: 'no-active-recording', message: 'No voice recording is active.' };
    }
    this.activeSession = null;
    return {
      runId: session.runId,
      audioRef: session.runId,
      mimeType: 'audio/wav',
      durationMs: 1_000,
      sizeBytes: 64_000,
    };
  }

  async cancelRecording(): Promise<void> {
    this.activeSession = null;
    return undefined;
  }

  async discardRun(input: AudioCapturePluginDiscardRunInput): Promise<void> {
    if (this.activeSession?.runId === input.runId) {
      this.activeSession = null;
    }
    return undefined;
  }

  private createRunId(index: number): string {
    return `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`;
  }
}
