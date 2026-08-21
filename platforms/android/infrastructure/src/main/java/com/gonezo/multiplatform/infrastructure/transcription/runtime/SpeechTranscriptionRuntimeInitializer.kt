package com.gonezo.multiplatform.infrastructure.transcription.runtime

import com.gonezo.multiplatform.infrastructure.transcription.factory.TranscriptionConfigurationException

internal class SpeechTranscriptionRuntimeInitializer(
  private val transcriberFactory: () -> AndroidSpeechTranscriber,
) {
  fun initialize(): SpeechTranscriptionRuntimeState {
    return try {
      SpeechTranscriptionRuntimeState.Ready(
        transcriberFactory(),
      )
    } catch (exception: TranscriptionConfigurationException) {
      throw exception
    } catch (_: Exception) {
      SpeechTranscriptionRuntimeState.Unavailable
    }
  }
}
