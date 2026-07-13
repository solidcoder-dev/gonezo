package com.gonezo.multiplatform.plugins.interpretation.artifacts

data class InterpretationArtifactCleanupPolicy(
  val staleRecordingAfterMs: Long,
) {
  init {
    require(staleRecordingAfterMs > 0) {
      "staleRecordingAfterMs must be positive"
    }
  }

  companion object {
    val DEFAULT = InterpretationArtifactCleanupPolicy(
      staleRecordingAfterMs = 60 * 60 * 1_000L,
    )
  }
}
