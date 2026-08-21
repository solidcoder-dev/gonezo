package com.gonezo.multiplatform.plugins.speech

import com.gonezo.multiplatform.infrastructure.transcription.TranscriptionFailureCodes

internal object SpeechTranscriptionFailureCodes {
  const val ARTIFACT_STORAGE_FAILED = TranscriptionFailureCodes.ARTIFACT_STORAGE_FAILED
  const val AUDIO_NOT_FOUND = TranscriptionFailureCodes.AUDIO_NOT_FOUND
  const val INVALID_AUDIO = TranscriptionFailureCodes.INVALID_AUDIO
  const val MODEL_CORRUPT = TranscriptionFailureCodes.MODEL_CORRUPT
  const val MODEL_UNAVAILABLE = TranscriptionFailureCodes.MODEL_UNAVAILABLE
  const val NATIVE_TRANSCRIPTION_FAILED = TranscriptionFailureCodes.NATIVE_TRANSCRIPTION_FAILED
  const val NO_SPEECH_DETECTED = TranscriptionFailureCodes.NO_SPEECH_DETECTED
  const val TRANSCRIPTION_CANCELLED = TranscriptionFailureCodes.TRANSCRIPTION_CANCELLED
  const val TRANSCRIPTION_INVALID_OUTPUT = TranscriptionFailureCodes.TRANSCRIPTION_INVALID_OUTPUT
  const val TRANSCRIPTION_UNAVAILABLE = TranscriptionFailureCodes.TRANSCRIPTION_UNAVAILABLE
  const val UNSUPPORTED_TRANSCRIPTION_LANGUAGE = TranscriptionFailureCodes.UNSUPPORTED_TRANSCRIPTION_LANGUAGE
}
