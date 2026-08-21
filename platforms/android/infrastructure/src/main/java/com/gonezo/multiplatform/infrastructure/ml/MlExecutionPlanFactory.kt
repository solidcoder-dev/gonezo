package com.gonezo.multiplatform.infrastructure.ml

internal class MlExecutionPlanFactory {
  fun create(capabilities: DeviceMlCapabilities): MlExecutionPlan {
    return if (capabilities.npuTarget != null && capabilities.supportsNpu) {
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
