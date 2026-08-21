package com.gonezo.multiplatform.infrastructure.processing.litert.runtime

import com.gonezo.multiplatform.infrastructure.ml.MlExecutionTarget
import com.google.ai.edge.litertlm.Backend

internal interface LiteRtBackendFactory {
  fun create(target: MlExecutionTarget): Backend
}

internal class AndroidLiteRtBackendFactory(
  private val nativeLibraryDir: String,
) : LiteRtBackendFactory {
  override fun create(target: MlExecutionTarget): Backend {
    val backend = when (target) {
      MlExecutionTarget.GPU -> Backend.GPU()
      MlExecutionTarget.NPU -> Backend.NPU(nativeLibraryDir)
      MlExecutionTarget.CPU -> error("LiteRT CPU interpretation is not supported by this runtime.")
    }
    return backend
  }
}
