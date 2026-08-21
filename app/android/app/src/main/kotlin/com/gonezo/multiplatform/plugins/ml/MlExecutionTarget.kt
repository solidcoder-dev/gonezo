package com.gonezo.multiplatform.plugins.ml

enum class MlExecutionTarget {
  CPU,
  GPU,
  NPU,
}

data class MlExecutionPlan(
  val speech: MlExecutionTarget,
  val interpretation: MlExecutionTarget,
)

enum class NpuTarget {
  QUALCOMM_SM8850,
}
