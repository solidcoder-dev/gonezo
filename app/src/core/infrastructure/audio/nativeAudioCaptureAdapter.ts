import type { AudioCapturePort } from '../../../transactions/application/MovementVoiceEntry/AudioCapturePort';
import type { CapturedAudio, CapturedAudioRef, RecordingSession } from '../../../transactions/application/MovementVoiceEntry/movementVoiceCapture.types';
import { AudioCapturePlugin, type AudioCapturePluginResult } from './audioCapturePlugin';
import type { TranscriptionSettings } from '../../../transactions/application/MovementVoiceEntry/TranscriptionSettings';
import type { SpeechTranscriptionResult, TranscriptionFailure } from '../../../transactions/application/MovementVoiceEntry/SpeechTranscriptionPort';
import type { ProcessingPreparer } from '../processing/processingPreparer';

const TRANSCRIPTION_FAILURE_CODES = new Set([
  'artifact-storage-failed', 'audio-not-found', 'invalid-audio', 'model-corrupt', 'model-unavailable',
  'native-transcription-failed', 'no-speech-detected', 'transcription-cancelled', 'transcription-empty',
  'transcription-invalid-output', 'transcription-unavailable', 'unsupported-transcription-language',
]);

function mapStreamingTranscription(result: AudioCapturePluginResult): SpeechTranscriptionResult | undefined {
  if (!result.transcript && !result.transcriptionError) return undefined;
  if (result.transcript) return { transcript: result.transcript };
  const failure = result.transcriptionError!;
  return {
    failure: {
      code: TRANSCRIPTION_FAILURE_CODES.has(failure.code) ? failure.code as TranscriptionFailure['code'] : 'native-transcription-failed',
      message: failure.message,
      recoverable: failure.recoverable,
      retryable: failure.retryable,
    },
  };
}

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
  private readonly processingPreparer?: ProcessingPreparer;

  constructor(processingPreparer?: ProcessingPreparer) {
    this.processingPreparer = processingPreparer;
  }

  async start(settings?: TranscriptionSettings): Promise<RecordingSession> {
    try {
      const session = await AudioCapturePlugin.startRecording(settings);
      void Promise.resolve()
        .then(() => this.processingPreparer?.prepare())
        .catch(() => undefined);
      return session;
    } catch (error) {
      throw toAudioCaptureError(error);
    }
  }

  async stop(): Promise<CapturedAudio> {
    try {
      const result = await AudioCapturePlugin.stopRecording();
      return {
        ...result,
        audioRef: result.audioRef as CapturedAudioRef,
        transcription: mapStreamingTranscription(result),
      };
    } catch (error) {
      throw toAudioCaptureError(error);
    }
  }

  async cancel(): Promise<void> {
    try {
      this.processingPreparer?.cancel();
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
