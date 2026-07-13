import type { SpeechTranscriptionPort, SpeechTranscriptionRequest, SpeechTranscriptionResult, TranscriptionFailure } from '../../../transactions/application/MovementVoiceEntry/SpeechTranscriptionPort';
import { SpeechTranscriptionPlugin } from './speechTranscriptionPlugin';

const TRANSCRIPTION_FAILURE_CODES = new Set([
  'artifact-storage-failed',
  'audio-not-found',
  'invalid-audio',
  'model-unavailable',
  'model-corrupt',
  'native-transcription-failed',
  'no-speech-detected',
  'transcription-cancelled',
  'transcription-empty',
  'transcription-invalid-output',
  'transcription-unavailable',
  'unsupported-transcription-language',
]);

function mapFailure(error: { code: string; message: string; recoverable: boolean; retryable?: boolean }) {
  const code: TranscriptionFailure['code'] = TRANSCRIPTION_FAILURE_CODES.has(error.code)
    ? error.code as TranscriptionFailure['code']
    : 'native-transcription-failed';
  return {
    code,
    message: error.message,
    recoverable: error.recoverable,
    retryable: error.retryable ?? error.recoverable,
  };
}

export class NativeSpeechTranscriptionAdapter implements SpeechTranscriptionPort {
  async transcribe(request: SpeechTranscriptionRequest): Promise<SpeechTranscriptionResult> {
    try {
      const result = await SpeechTranscriptionPlugin.transcribe({
        runId: request.runId,
        audioRef: request.audioRef,
        language: request.language,
        detectLanguageAutomatically: request.detectLanguageAutomatically,
      });
      if (result.transcript?.text.trim()) {
        return { transcript: result.transcript, language: result.language ?? request.language };
      }
      return {
        failure: result.error ? mapFailure(result.error) : {
          code: 'transcription-invalid-output',
          message: 'Local speech transcription returned invalid output.',
          recoverable: true,
          retryable: true,
        },
      };
    } catch (error) {
      const nativeError = error as { code?: string; message?: string; recoverable?: boolean; retryable?: boolean };
      const code: TranscriptionFailure['code'] = nativeError.code && TRANSCRIPTION_FAILURE_CODES.has(nativeError.code)
        ? nativeError.code as TranscriptionFailure['code']
        : 'native-transcription-failed';
      return {
        failure: {
          code,
          message: nativeError.message?.trim() || 'Local speech transcription failed.',
          recoverable: nativeError.recoverable ?? true,
          retryable: nativeError.retryable ?? nativeError.recoverable ?? true,
        },
      };
    }
  }

  async cancel(): Promise<void> {
    await SpeechTranscriptionPlugin.cancel();
  }
}
