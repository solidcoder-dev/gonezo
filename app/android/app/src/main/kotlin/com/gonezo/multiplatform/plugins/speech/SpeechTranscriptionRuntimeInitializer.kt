package com.gonezo.multiplatform.plugins.speech

internal class SpeechTranscriptionRuntimeInitializer(
  private val configurationReader: SpeechModelConfigurationReader,
  private val transcriberFactory: (SpeechModelConfiguration) -> AndroidSpeechTranscriber,
) {
  fun initialize(): SpeechTranscriptionRuntimeState {
    return try {
      val configuration = configurationReader.read()
      SpeechTranscriptionRuntimeState.Ready(
        transcriberFactory(configuration),
      )
    } catch (_: Exception) {
      SpeechTranscriptionRuntimeState.Unavailable(
        modelUnavailableSpeechTranscriptionIssue(),
      )
    }
  }
}
