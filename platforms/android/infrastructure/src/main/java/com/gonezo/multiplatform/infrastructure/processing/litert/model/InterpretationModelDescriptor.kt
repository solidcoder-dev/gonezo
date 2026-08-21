package com.gonezo.multiplatform.infrastructure.processing.litert.model

import com.gonezo.multiplatform.infrastructure.ml.MlExecutionTarget
import com.gonezo.multiplatform.infrastructure.ml.NpuTarget

internal data class InterpretationModelDescriptor(
  val modelId: String,
  val modelVersion: String,
  val assetPath: String,
  val fileName: String,
  val expectedSizeBytes: Long,
  val sha256: String,
  val target: MlExecutionTarget = MlExecutionTarget.GPU,
  val npuTarget: NpuTarget? = null,
)
