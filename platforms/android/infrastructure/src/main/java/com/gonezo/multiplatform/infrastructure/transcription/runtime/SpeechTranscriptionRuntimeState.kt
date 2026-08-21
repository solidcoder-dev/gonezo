package com.gonezo.multiplatform.infrastructure.transcription.runtime

internal sealed interface SpeechTranscriptionRuntimeState {
  data class Ready(
    val transcriber: AndroidTranscriber,
  ) : SpeechTranscriptionRuntimeState

  data object Unavailable : SpeechTranscriptionRuntimeState
}
