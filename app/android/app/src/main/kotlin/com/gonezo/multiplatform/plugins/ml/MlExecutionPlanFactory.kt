package com.gonezo.multiplatform.plugins.ml

internal class MlExecutionPlanFactory {
  fun create(capabilities: DeviceMlCapabilities): MlExecutionPlan {
    return if (capabilities.npuTarget == NpuTarget.QUALCOMM_SM8850 && capabilities.supportsNpu) {
      MlExecutionPlan(
        speech = MlExecutionTarget.CPU,
        interpretation = MlExecutionTarget.NPU,
      )
    } else {
      MlExecutionPlan(
        speech = MlExecutionTarget.CPU,
        interpretation = MlExecutionTarget.GPU,
      )
    }
  }
}
