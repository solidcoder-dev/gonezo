package com.gonezo.multiplatform.plugins.speech.preprocessing

sealed interface SpeechAudioPreparation {
  data class Ready(
    val samples: FloatArray,
    val speechDurationMs: Long,
  ) : SpeechAudioPreparation

  data object NoSpeech : SpeechAudioPreparation
}
