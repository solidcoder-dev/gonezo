package com.gonezo.multiplatform.infrastructure.transcription.factory

import android.content.Context
import com.gonezo.multiplatform.infrastructure.configuration.AndroidProcessingConfiguration
import com.gonezo.multiplatform.infrastructure.configuration.TranscriptionMode
import com.gonezo.multiplatform.infrastructure.configuration.TranscriptionProvider
import com.gonezo.multiplatform.infrastructure.transcription.model.AssetModelProvider
import com.gonezo.multiplatform.infrastructure.transcription.model.SpeechModelConfigurationReader
import com.gonezo.multiplatform.infrastructure.transcription.runtime.AndroidTranscriber
import com.gonezo.multiplatform.infrastructure.transcription.whisper.WhisperCppTranscriber
import com.gonezo.multiplatform.infrastructure.transcription.whisper.WhisperCppStreamingTranscriber
import dev.solidcoder.speech.AudioSourceRef
import java.io.File

internal class TranscriberFactory(
  private val context: Context?,
  private val configuration: AndroidProcessingConfiguration,
  private val sourceResolver: (AudioSourceRef) -> File,
) {
  fun create(): AndroidTranscriber {
    if (configuration.transcriptionProvider != TranscriptionProvider.WHISPER_CPP) {
      throw TranscriptionConfigurationException(
        "Transcription configuration ${configuration.transcriptionMode} + " +
          "${configuration.transcriptionProvider} is not implemented yet",
      )
    }

    val modelConfiguration = SpeechModelConfigurationReader(requireNotNull(context)).read()
    val modelProvider = AssetModelProvider(
      context = context,
      assetPath = modelConfiguration.assetPath,
      expectedSize = modelConfiguration.expectedSize,
      expectedSha256 = modelConfiguration.expectedSha256,
    )
    return when (configuration.transcriptionMode) {
      TranscriptionMode.FULL -> WhisperCppTranscriber(sourceResolver, modelProvider)
      TranscriptionMode.STREAMING -> WhisperCppStreamingTranscriber(modelProvider)
    }
  }
}

internal class TranscriptionConfigurationException(message: String) : IllegalArgumentException(message)
