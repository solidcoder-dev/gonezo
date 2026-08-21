package com.gonezo.multiplatform.infrastructure.processing.litert.model

import com.gonezo.multiplatform.infrastructure.ml.MlExecutionTarget
import com.gonezo.multiplatform.infrastructure.ml.NpuTarget

internal class InterpretationModelSelector {
  fun select(
    target: MlExecutionTarget,
    descriptors: List<InterpretationModelDescriptor>,
  ): InterpretationModelDescriptor {
    return descriptors.singleOrNull { descriptor ->
      descriptor.target == target && when (target) {
        MlExecutionTarget.NPU -> descriptor.npuTarget == NpuTarget.QUALCOMM_SM8850
        MlExecutionTarget.CPU,
        MlExecutionTarget.GPU -> descriptor.npuTarget == null
      }
    } ?: error("No compatible interpretation model is configured for $target.")
  }
}
