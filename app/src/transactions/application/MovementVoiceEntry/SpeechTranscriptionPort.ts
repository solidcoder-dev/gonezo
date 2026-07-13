import type { CapturedAudioRef } from './movementVoiceCapture.types';

export type SpeechTranscriptionRequest = {
  runId: string;
  audioRef: CapturedAudioRef;
  language?: string;
  detectLanguageAutomatically?: boolean;
};

export type TranscriptSegment = {
  text: string;
  startMs: number;
  endMs: number;
  noSpeechProbability: number;
};

export type Transcript = {
  text: string;
  segments?: TranscriptSegment[];
};

export type TranscriptionFailure = {
  code: 'artifact-storage-failed' | 'audio-not-found' | 'invalid-audio' | 'model-corrupt' | 'model-unavailable' | 'native-transcription-failed' | 'no-speech-detected' | 'transcription-cancelled' | 'transcription-empty' | 'transcription-invalid-output' | 'transcription-unavailable' | 'unsupported-transcription-language';
  message: string;
  recoverable: boolean;
  retryable: boolean;
};

export type SpeechTranscriptionResult = {
  transcript?: Transcript;
  language?: string;
  failure?: TranscriptionFailure;
};

export interface SpeechTranscriptionPort {
  transcribe(request: SpeechTranscriptionRequest): Promise<SpeechTranscriptionResult>;
  cancel(): Promise<void>;
}
