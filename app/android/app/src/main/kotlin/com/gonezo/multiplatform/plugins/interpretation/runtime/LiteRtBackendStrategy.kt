package com.gonezo.multiplatform.plugins.interpretation.runtime

import com.gonezo.multiplatform.plugins.ml.MlExecutionTarget
import com.google.ai.edge.litertlm.Backend

internal interface LiteRtBackendStrategy {
  val target: MlExecutionTarget

  fun createBackend(): Backend
}

internal class LiteRtGpuBackendStrategy : LiteRtBackendStrategy {
  override val target = MlExecutionTarget.GPU

  override fun createBackend(): Backend = Backend.GPU()
}

internal class LiteRtNpuBackendStrategy(
  private val nativeLibraryDir: String,
) : LiteRtBackendStrategy {
  override val target = MlExecutionTarget.NPU

  override fun createBackend(): Backend = Backend.NPU(nativeLibraryDir)
}

internal class LiteRtBackendStrategyFactory {
  fun create(target: MlExecutionTarget, nativeLibraryDir: String?): LiteRtBackendStrategy {
    return when (target) {
      MlExecutionTarget.GPU -> LiteRtGpuBackendStrategy()
      MlExecutionTarget.NPU -> LiteRtNpuBackendStrategy(
        nativeLibraryDir = requireNotNull(nativeLibraryDir) {
          "A native library directory is required for LiteRT NPU execution."
        },
      )
      MlExecutionTarget.CPU -> error("LiteRT CPU interpretation is not supported by this runtime.")
    }
  }
}
