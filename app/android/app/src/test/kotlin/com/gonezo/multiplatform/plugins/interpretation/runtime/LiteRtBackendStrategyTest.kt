package com.gonezo.multiplatform.plugins.interpretation.runtime

import com.gonezo.multiplatform.plugins.ml.MlExecutionTarget
import com.google.ai.edge.litertlm.Backend
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class LiteRtBackendStrategyTest {
  @Test
  fun `maps GPU to LiteRT GPU`() {
    val backend = LiteRtBackendStrategyFactory().create(MlExecutionTarget.GPU, null).createBackend()

    assertTrue(backend is Backend.GPU)
  }

  @Test
  fun `maps NPU to LiteRT NPU with the composition root library directory`() {
    val backend = LiteRtBackendStrategyFactory().create(MlExecutionTarget.NPU, "/app/lib").createBackend()

    assertTrue(backend is Backend.NPU)
    assertEquals("/app/lib", (backend as Backend.NPU).nativeLibraryDir)
  }
}
