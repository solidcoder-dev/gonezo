package com.gonezo.multiplatform.plugins.speech

import android.content.Context

internal class SpeechModelConfigurationReader(
  private val metadataValue: (String) -> Any?,
) {
  constructor(context: Context) : this(
    metadataValue = { key ->
      context.applicationInfo.metaData?.get(key)
    },
  )

  fun read(): SpeechModelConfiguration {
    return SpeechModelConfiguration(
      assetPath = requireAssetPath(MODEL_ASSET_METADATA),
      expectedSize = requirePositiveLong(MODEL_SIZE_METADATA),
      expectedSha256 = requireSha256(MODEL_SHA256_METADATA),
    )
  }

  private fun requireAssetPath(key: String): String {
    val rawValue = metadataValue(key) ?: return DEFAULT_MODEL_ASSET
    val assetPath = (rawValue as? String)?.trim()
      ?: throw SpeechModelConfigurationException("Speech model metadata is invalid: $key")

    if (
      assetPath.isEmpty()
      || assetPath.startsWith('/')
      || assetPath.split('/').any { it == ".." }
    ) {
      throw SpeechModelConfigurationException("Speech model metadata is invalid: $key")
    }

    return assetPath
  }

  private fun requirePositiveLong(key: String): Long {
    val rawValue = metadataValue(key)
    val parsedValue = when (rawValue) {
      is Number -> rawValue.toLong()
      is String -> rawValue.trim().toLongOrNull()
      else -> null
    }

    return parsedValue
      ?.takeIf { it > 0L }
      ?: throw SpeechModelConfigurationException("Speech model metadata is invalid: $key")
  }

  private fun requireSha256(key: String): String {
    val rawValue = metadataValue(key)
    val sha256 = (rawValue as? String)
      ?.trim()
      ?.lowercase()
      ?: throw SpeechModelConfigurationException("Speech model metadata is invalid: $key")

    if (!SHA256_PATTERN.matches(sha256)) {
      throw SpeechModelConfigurationException("Speech model metadata is invalid: $key")
    }

    return sha256
  }

  companion object {
    private const val MODEL_ASSET_METADATA = "gonezo.speech.model.asset"
    private const val MODEL_SIZE_METADATA = "gonezo.speech.model.size"
    private const val MODEL_SHA256_METADATA = "gonezo.speech.model.sha256"
    private const val DEFAULT_MODEL_ASSET = "speech-transcription/whisper/ggml-tiny.bin"
    private val SHA256_PATTERN = Regex("^[a-fA-F0-9]{64}$")
  }
}
