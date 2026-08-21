package com.gonezo.multiplatform.plugins.interpretation.runtime

import com.gonezo.multiplatform.plugins.ml.MlExecutionTarget
import com.google.ai.edge.litertlm.Backend

internal interface LiteRtBackendFactory {
  fun create(target: MlExecutionTarget): Backend
}

internal class AndroidLiteRtBackendFactory(
  private val nativeLibraryDir: String,
) : LiteRtBackendFactory {
  override fun create(target: MlExecutionTarget): Backend {
    return when (target) {
      MlExecutionTarget.GPU -> Backend.GPU()
      MlExecutionTarget.NPU -> Backend.NPU(nativeLibraryDir)
      MlExecutionTarget.CPU -> error("LiteRT CPU interpretation is not supported by this runtime.")
    }
  }
}
