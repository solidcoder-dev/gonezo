package com.gonezo.multiplatform.plugins.interpretation.model

import android.content.Context

internal class InterpretationModelConfigurationReader(
  private val metadataValue: (String) -> Any?,
) {
  constructor(context: Context) : this(
    metadataValue = { key -> context.applicationInfo.metaData?.get(key) },
  )

  fun read(): InterpretationModelConfiguration {
    return InterpretationModelConfiguration(
      modelId = requireText(MODEL_ID_METADATA),
      modelVersion = requireText(MODEL_VERSION_METADATA),
      assetPath = requireAssetPath(MODEL_ASSET_METADATA),
      fileName = requireFileName(MODEL_FILE_NAME_METADATA),
      expectedSizeBytes = requirePositiveLong(MODEL_SIZE_METADATA),
      sha256 = requireSha256(MODEL_SHA256_METADATA),
    )
  }

  private fun requireText(key: String): String {
    val raw = metadataValue(key) as? String
      ?: throw InterpretationModelConfigurationException("Interpretation model metadata is invalid: $key")
    val value = raw.trim()
    if (value.isEmpty()) {
      throw InterpretationModelConfigurationException("Interpretation model metadata is invalid: $key")
    }
    return value
  }

  private fun requireAssetPath(key: String): String {
    val assetPath = requireText(key)
    if (assetPath.startsWith('/') || assetPath.split('/').any { it == ".." }) {
      throw InterpretationModelConfigurationException("Interpretation model metadata is invalid: $key")
    }
    return assetPath
  }

  private fun requireFileName(key: String): String {
    val fileName = requireText(key)
    if (fileName.contains('/') || fileName.contains("..")) {
      throw InterpretationModelConfigurationException("Interpretation model metadata is invalid: $key")
    }
    return fileName
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
      ?: throw InterpretationModelConfigurationException("Interpretation model metadata is invalid: $key")
  }

  private fun requireSha256(key: String): String {
    val sha = requireText(key).lowercase()
    if (!SHA256_PATTERN.matches(sha)) {
      throw InterpretationModelConfigurationException("Interpretation model metadata is invalid: $key")
    }
    return sha
  }

  companion object {
    private const val MODEL_ID_METADATA = "gonezo.interpretation.model.id"
    private const val MODEL_VERSION_METADATA = "gonezo.interpretation.model.version"
    private const val MODEL_ASSET_METADATA = "gonezo.interpretation.model.asset"
    private const val MODEL_FILE_NAME_METADATA = "gonezo.interpretation.model.fileName"
    private const val MODEL_SIZE_METADATA = "gonezo.interpretation.model.size"
    private const val MODEL_SHA256_METADATA = "gonezo.interpretation.model.sha256"
    private val SHA256_PATTERN = Regex("^[a-f0-9]{64}$")
  }
}
