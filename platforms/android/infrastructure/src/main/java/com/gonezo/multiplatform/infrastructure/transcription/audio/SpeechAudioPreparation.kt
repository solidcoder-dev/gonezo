package com.gonezo.multiplatform.infrastructure.transcription.audio

sealed interface SpeechAudioPreparation {
  data class Ready(
    val samples: FloatArray,
    val speechDurationMs: Long,
  ) : SpeechAudioPreparation

  data object NoSpeech : SpeechAudioPreparation
}
