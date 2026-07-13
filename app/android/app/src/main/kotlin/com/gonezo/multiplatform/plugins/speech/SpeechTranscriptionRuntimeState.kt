package com.gonezo.multiplatform.plugins.speech

import dev.solidcoder.speech.TranscriptionIssue
import dev.solidcoder.speech.TranscriptionIssueSeverity

internal sealed interface SpeechTranscriptionRuntimeState {
  data class Ready(
    val transcriber: WhisperCppTranscriber,
  ) : SpeechTranscriptionRuntimeState

  data class Unavailable(
    val issue: TranscriptionIssue,
  ) : SpeechTranscriptionRuntimeState
}

internal fun modelUnavailableSpeechTranscriptionIssue(): TranscriptionIssue {
  return TranscriptionIssue(
    SpeechTranscriptionFailureCodes.MODEL_UNAVAILABLE,
    "Local speech transcription model is unavailable.",
    TranscriptionIssueSeverity.DEFINITIVE,
  )
}
