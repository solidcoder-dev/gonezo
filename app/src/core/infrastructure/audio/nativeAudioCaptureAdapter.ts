import type { AudioCapturePort } from '../../../transactions/application/MovementVoiceEntry/AudioCapturePort';
import type { CapturedAudio, CapturedAudioRef, RecordingSession } from '../../../transactions/application/MovementVoiceEntry/movementVoiceCapture.types';
import { AudioCapturePlugin } from './audioCapturePlugin';

type NativePluginError = {
  code?: string;
  message?: string;
};

function toAudioCaptureError(error: unknown): NativePluginError {
  if (typeof error === 'object' && error !== null) {
    const code = typeof (error as NativePluginError).code === 'string' ? (error as NativePluginError).code : undefined;
    const message = typeof (error as NativePluginError).message === 'string' ? (error as NativePluginError).message : undefined;
    return { code, message };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: 'Unknown audio capture failure.' };
}

export class NativeAudioCaptureAdapter implements AudioCapturePort {
  async start(): Promise<RecordingSession> {
    try {
      return await AudioCapturePlugin.startRecording();
    } catch (error) {
      throw toAudioCaptureError(error);
    }
  }

  async stop(): Promise<CapturedAudio> {
    try {
      const result = await AudioCapturePlugin.stopRecording();
      return { ...result, audioRef: result.audioRef as CapturedAudioRef };
    } catch (error) {
      throw toAudioCaptureError(error);
    }
  }

  async cancel(): Promise<void> {
    try {
      await AudioCapturePlugin.cancelRecording();
    } catch (error) {
      throw toAudioCaptureError(error);
    }
  }

  async discardRun(runId: string): Promise<void> {
    try {
      await AudioCapturePlugin.discardRun({ runId });
    } catch (error) {
      throw toAudioCaptureError(error);
    }
  }
}
