package com.gonezo.multiplatform.infrastructure.processing.litert.runtime

import com.gonezo.multiplatform.infrastructure.ml.MlExecutionTarget
import com.google.ai.edge.litertlm.Backend
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class LiteRtBackendStrategyTest {
  @Test
  fun `maps GPU to LiteRT GPU`() {
    val backend = AndroidLiteRtBackendFactory("/app/lib").create(MlExecutionTarget.GPU)

    assertTrue(backend is Backend.GPU)
  }

  @Test
  fun `maps NPU to LiteRT NPU with the composition root library directory`() {
    val backend = AndroidLiteRtBackendFactory("/app/lib").create(MlExecutionTarget.NPU)

    assertTrue(backend is Backend.NPU)
    assertEquals("/app/lib", (backend as Backend.NPU).nativeLibraryDir)
  }
}
