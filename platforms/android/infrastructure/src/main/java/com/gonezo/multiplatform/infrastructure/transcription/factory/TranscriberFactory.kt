package com.gonezo.multiplatform.infrastructure.transcription.factory

import android.content.Context
import com.gonezo.multiplatform.infrastructure.configuration.AndroidProcessingConfiguration
import com.gonezo.multiplatform.infrastructure.configuration.TranscriptionMode
import com.gonezo.multiplatform.infrastructure.configuration.TranscriptionProvider
import com.gonezo.multiplatform.infrastructure.transcription.model.AssetModelProvider
import com.gonezo.multiplatform.infrastructure.transcription.model.SpeechModelConfigurationReader
import com.gonezo.multiplatform.infrastructure.transcription.android.AndroidOnDeviceSpeechRecognizerFactory
import com.gonezo.multiplatform.infrastructure.transcription.android.AndroidOnDeviceSpeechTranscriber
import com.gonezo.multiplatform.infrastructure.transcription.runtime.FallbackAndroidSpeechTranscriber
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
    if (configuration.transcriptionProvider == TranscriptionProvider.WHISPER_CPP) {
      return createWhisper()
    }
    if (configuration.transcriptionProvider != TranscriptionProvider.ANDROID_SPEECH) {
      throw TranscriptionConfigurationException(
        "Transcription configuration ${configuration.transcriptionMode} + " +
          "${configuration.transcriptionProvider} is not implemented yet",
      )
    }
    if (configuration.transcriptionMode != TranscriptionMode.FULL) {
      throw TranscriptionConfigurationException("ANDROID_SPEECH transcription requires FULL mode")
    }

    val fallback = createWhisper()
    val preferred = try {
      AndroidOnDeviceSpeechTranscriber(
        sourceResolver = sourceResolver,
        recognizerFactory = AndroidOnDeviceSpeechRecognizerFactory(requireNotNull(context)),
      )
    } catch (_: Exception) {
      return fallback
    }
    return FallbackAndroidSpeechTranscriber(preferred, fallback)
  }

  private fun createWhisper(): AndroidTranscriber {
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
