package com.gonezo.multiplatform.plugins.speech

internal object SpeechTranscriptionFailureCodes {
  const val ARTIFACT_STORAGE_FAILED = "artifact-storage-failed"
  const val AUDIO_NOT_FOUND = "audio-not-found"
  const val INVALID_AUDIO = "invalid-audio"
  const val MODEL_CORRUPT = "model-corrupt"
  const val MODEL_UNAVAILABLE = "model-unavailable"
  const val NATIVE_TRANSCRIPTION_FAILED = "native-transcription-failed"
  const val NO_SPEECH_DETECTED = "no-speech-detected"
  const val TRANSCRIPTION_CANCELLED = "transcription-cancelled"
  const val TRANSCRIPTION_INVALID_OUTPUT = "transcription-invalid-output"
  const val TRANSCRIPTION_UNAVAILABLE = "transcription-unavailable"
  const val UNSUPPORTED_TRANSCRIPTION_LANGUAGE = "unsupported-transcription-language"
}
