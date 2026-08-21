package com.gonezo.multiplatform.infrastructure.processing.litert.model

import com.gonezo.multiplatform.infrastructure.ml.MlExecutionTarget
import com.gonezo.multiplatform.infrastructure.ml.NpuTarget
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class InterpretationModelSelectorTest {
  private val gpu = descriptor(MlExecutionTarget.GPU, null, "gpu.litertlm")
  private val npu = descriptor(MlExecutionTarget.NPU, NpuTarget.QUALCOMM_SM8850, "sm8850.litertlm")

  @Test
  fun `selects the SM8850 model for NPU`() {
    assertEquals("sm8850.litertlm", InterpretationModelSelector().select(MlExecutionTarget.NPU, listOf(gpu, npu)).fileName)
  }

  @Test
  fun `selects the existing GPU model for GPU`() {
    assertEquals("gpu.litertlm", InterpretationModelSelector().select(MlExecutionTarget.GPU, listOf(gpu, npu)).fileName)
  }

  @Test
  fun `rejects incompatible target and model combinations`() {
    assertThrows(IllegalStateException::class.java) {
      InterpretationModelSelector().select(MlExecutionTarget.NPU, listOf(gpu))
    }
  }

  private fun descriptor(target: MlExecutionTarget, npuTarget: NpuTarget?, fileName: String) = InterpretationModelDescriptor(
    modelId = "test",
    modelVersion = "1",
    assetPath = fileName,
    fileName = fileName,
    expectedSizeBytes = 1,
    sha256 = "a".repeat(64),
    target = target,
    npuTarget = npuTarget,
  )
}
