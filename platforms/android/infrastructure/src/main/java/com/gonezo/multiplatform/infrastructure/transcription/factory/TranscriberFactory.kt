package com.gonezo.multiplatform.infrastructure.transcription.factory

import android.content.Context
import com.gonezo.multiplatform.infrastructure.configuration.AndroidProcessingConfiguration
import com.gonezo.multiplatform.infrastructure.configuration.TranscriptionMode
import com.gonezo.multiplatform.infrastructure.configuration.TranscriptionProvider
import com.gonezo.multiplatform.infrastructure.transcription.model.AssetModelProvider
import com.gonezo.multiplatform.infrastructure.transcription.model.SpeechModelConfigurationReader
import com.gonezo.multiplatform.infrastructure.transcription.runtime.AndroidSpeechTranscriber
import com.gonezo.multiplatform.infrastructure.transcription.whisper.WhisperCppTranscriber
import dev.solidcoder.speech.AudioSourceRef
import java.io.File

internal class TranscriberFactory(
  private val context: Context?,
  private val configuration: AndroidProcessingConfiguration,
  private val sourceResolver: (AudioSourceRef) -> File,
) {
  fun create(): AndroidSpeechTranscriber {
    if (configuration.transcriptionMode != TranscriptionMode.FULL ||
      configuration.transcriptionProvider != TranscriptionProvider.WHISPER_CPP
    ) {
      throw TranscriptionConfigurationException(
        "Transcription configuration ${configuration.transcriptionMode} + " +
          "${configuration.transcriptionProvider} is not implemented yet",
      )
    }

    val modelConfiguration = SpeechModelConfigurationReader(requireNotNull(context)).read()
    return WhisperCppTranscriber(
      sourceResolver = sourceResolver,
      modelProvider = AssetModelProvider(
        context = context,
        assetPath = modelConfiguration.assetPath,
        expectedSize = modelConfiguration.expectedSize,
        expectedSha256 = modelConfiguration.expectedSha256,
      ),
    )
  }
}

internal class TranscriptionConfigurationException(message: String) : IllegalArgumentException(message)
