package com.gonezo.multiplatform.infrastructure.configuration

import com.gonezo.multiplatform.BuildConfig

internal class AndroidProcessingConfigurationReader {
  fun read(): AndroidProcessingConfiguration = read(
    transcriptionMode = BuildConfig.GONEZO_TRANSCRIPTION_MODE,
    transcriptionProvider = BuildConfig.GONEZO_TRANSCRIPTION_PROVIDER,
    processingProvider = BuildConfig.GONEZO_PROCESSING_PROVIDER,
  )

  fun read(
    transcriptionMode: String,
    transcriptionProvider: String,
    processingProvider: String,
  ): AndroidProcessingConfiguration {
    return AndroidProcessingConfiguration(
      transcriptionMode = parseValue("gonezoTranscriptionMode", transcriptionMode, TranscriptionMode::valueOf),
      transcriptionProvider = parseValue("gonezoTranscriptionProvider", transcriptionProvider, TranscriptionProvider::valueOf),
      processingProvider = parseValue("gonezoProcessingProvider", processingProvider, ProcessingProvider::valueOf),
    )
  }

  private fun <T : Enum<T>> parseValue(
    propertyName: String,
    rawValue: String,
    parser: (String) -> T,
  ): T {
    val normalized = rawValue.trim().uppercase()
    if (normalized.isEmpty()) {
      throw AndroidProcessingConfigurationException(
        "$propertyName must be one of the supported values, but was blank.",
      )
    }
    return try {
      parser(normalized)
    } catch (_: IllegalArgumentException) {
      throw AndroidProcessingConfigurationException(
        "$propertyName has unsupported value '$rawValue'.",
      )
    }
  }
}

internal class AndroidProcessingConfigurationException(message: String) : IllegalArgumentException(message)
