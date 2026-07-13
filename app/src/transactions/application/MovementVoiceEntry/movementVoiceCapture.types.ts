export type VoiceCaptureFunctionalState =
  | 'idle'
  | 'requesting-permission'
  | 'recording'
  | 'locked'
  | 'cancelling'
  | 'stopping'
  | 'transcribing'
  | 'processing'
  | 'draft-ready'
  | 'failed';

export type CaptureFailureCode =
  | 'permission-denied'
  | 'permission-permanently-denied'
  | 'recording-already-active'
  | 'no-active-recording'
  | 'artifact-storage-failed'
  | 'recording-too-short'
  | 'empty-audio'
  | 'no-speech-detected'
  | 'native-recorder-failure'
  | 'capture-cancelled'
  | 'processing-failed'
  | 'processing-unavailable'
  | 'interpretation-incomplete'
  | 'transcription-failed'
  | 'transcription-invalid-output'
  | 'unsupported-transcription-language'
  | 'unsupported-device'
  | 'no_usable_interpretation';

export type AudioCaptureFailureCode = Extract<CaptureFailureCode,
  | 'permission-denied'
  | 'permission-permanently-denied'
  | 'recording-already-active'
  | 'no-active-recording'
  | 'recording-too-short'
  | 'empty-audio'
  | 'native-recorder-failure'
  | 'capture-cancelled'
  | 'unsupported-device'>;

export type AudioCaptureFailure = {
  readonly code: AudioCaptureFailureCode;
  readonly message: string;
};

export type AudioCaptureOutcome =
  | { readonly kind: 'success'; readonly audio: CapturedAudio }
  | { readonly kind: 'failure'; readonly failure: AudioCaptureFailure };

export type CaptureFailure = {
  code: CaptureFailureCode;
  message: string;
};

export class AudioCaptureError extends Error {
  readonly code: AudioCaptureFailureCode;

  constructor(failure: AudioCaptureFailure) {
    super(failure.message);
    this.name = 'AudioCaptureError';
    this.code = failure.code;
  }
}

export type RecordingSession = {
  runId: string;
  startedAt: number;
};

export type CapturedAudioRef = string & { readonly __capturedAudioRef: unique symbol };

export type CapturedAudio = {
  runId: string;
  audioRef: CapturedAudioRef;
  mimeType: string;
  durationMs: number;
  sizeBytes: number;
};
