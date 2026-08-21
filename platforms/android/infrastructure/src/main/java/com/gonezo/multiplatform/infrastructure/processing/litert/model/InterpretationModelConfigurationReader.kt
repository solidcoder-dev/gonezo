package com.gonezo.multiplatform.infrastructure.processing.litert.model

import android.content.Context
import com.gonezo.multiplatform.infrastructure.ml.MlExecutionTarget
import com.gonezo.multiplatform.infrastructure.ml.NpuTarget

internal class InterpretationModelConfigurationReader(
  private val metadataValue: (String) -> Any?,
) {
  constructor(context: Context) : this(
    metadataValue = { key -> context.applicationInfo.metaData?.get(key) },
  )

  fun read(
    target: MlExecutionTarget = MlExecutionTarget.GPU,
    npuTarget: NpuTarget = NpuTarget.QUALCOMM_SM8850,
  ): InterpretationModelConfiguration {
    val metadataPrefix = when {
      target != MlExecutionTarget.NPU -> METADATA_PREFIX
      npuTarget == NpuTarget.QUALCOMM_SM8750 -> NPU_SM8750_METADATA_PREFIX
      else -> NPU_METADATA_PREFIX
    }
    val descriptorNpuTarget = if (target == MlExecutionTarget.NPU) npuTarget else null
    return InterpretationModelConfiguration(
      modelId = requireText(metadataPrefix + MODEL_ID_SUFFIX),
      modelVersion = requireText(metadataPrefix + MODEL_VERSION_SUFFIX),
      assetPath = requireAssetPath(metadataPrefix + MODEL_ASSET_SUFFIX),
      fileName = requireFileName(metadataPrefix + MODEL_FILE_NAME_SUFFIX),
      expectedSizeBytes = requirePositiveLong(metadataPrefix + MODEL_SIZE_SUFFIX),
      sha256 = requireSha256(metadataPrefix + MODEL_SHA256_SUFFIX),
      target = target,
      npuTarget = descriptorNpuTarget,
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
    private const val METADATA_PREFIX = "gonezo.interpretation.model."
    private const val NPU_METADATA_PREFIX = "gonezo.interpretation.model.npu."
    private const val NPU_SM8750_METADATA_PREFIX = "gonezo.interpretation.model.npu.sm8750."
    private const val MODEL_ID_SUFFIX = "id"
    private const val MODEL_VERSION_SUFFIX = "version"
    private const val MODEL_ASSET_SUFFIX = "asset"
    private const val MODEL_FILE_NAME_SUFFIX = "fileName"
    private const val MODEL_SIZE_SUFFIX = "size"
    private const val MODEL_SHA256_SUFFIX = "sha256"
    private val SHA256_PATTERN = Regex("^[a-f0-9]{64}$")
  }
}
