package com.gonezo.multiplatform.infrastructure.processing.isolation

import com.gonezo.multiplatform.infrastructure.ml.MlExecutionTarget
import com.gonezo.multiplatform.infrastructure.ml.NpuTarget
import com.gonezo.multiplatform.infrastructure.processing.litert.model.InterpretationModelConfiguration
import org.json.JSONObject

internal object InterpretationModelConfigurationCodec {
  fun encode(configuration: InterpretationModelConfiguration): String = JSONObject().apply {
    put("modelId", configuration.modelId)
    put("modelVersion", configuration.modelVersion)
    put("assetPath", configuration.assetPath)
    put("fileName", configuration.fileName)
    put("expectedSizeBytes", configuration.expectedSizeBytes)
    put("sha256", configuration.sha256)
    put("target", configuration.target.name)
    configuration.npuTarget?.let { put("npuTarget", it.name) }
  }.toString()

  fun decode(raw: String): InterpretationModelConfiguration {
    val json = JSONObject(raw)
    return InterpretationModelConfiguration(
      modelId = json.getString("modelId"),
      modelVersion = json.getString("modelVersion"),
      assetPath = json.getString("assetPath"),
      fileName = json.getString("fileName"),
      expectedSizeBytes = json.getLong("expectedSizeBytes"),
      sha256 = json.getString("sha256"),
      target = MlExecutionTarget.valueOf(json.getString("target")),
      npuTarget = json.optString("npuTarget").takeIf { it.isNotBlank() }?.let(NpuTarget::valueOf),
    )
  }
}
