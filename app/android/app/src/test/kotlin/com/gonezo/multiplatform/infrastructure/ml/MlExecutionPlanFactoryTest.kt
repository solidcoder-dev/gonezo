package com.gonezo.multiplatform.infrastructure.ml

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MlExecutionPlanFactoryTest {
  @Test
  fun `normalizes SM8850 and exposes the known Qualcomm NPU`() {
    val capabilities = AndroidDeviceMlCapabilities(socModelProvider = { " sm8850 " })

    assertTrue(capabilities.supportsNpu)
    assertTrue(capabilities.supportsGpu)
    assertEquals(NpuTarget.QUALCOMM_SM8850, capabilities.npuTarget)
  }

  @Test
  fun `does not assume NPU support for an unknown SoC`() {
    val capabilities = AndroidDeviceMlCapabilities(socModelProvider = { "SM9999" })

    assertFalse(capabilities.supportsNpu)
    assertEquals(null, capabilities.npuTarget)
    assertTrue(capabilities.supportsGpu)
  }

  @Test
  fun `selects CPU speech and NPU interpretation for SM8850`() {
    val plan = MlExecutionPlanFactory().create(
      AndroidDeviceMlCapabilities(socModelProvider = { "SM8850" }),
    )

    assertEquals(MlExecutionTarget.CPU, plan.speech)
    assertEquals(MlExecutionTarget.NPU, plan.interpretation)
  }

  @Test
  fun `preserves CPU speech and GPU interpretation for unsupported devices`() {
    val plan = MlExecutionPlanFactory().create(
      AndroidDeviceMlCapabilities(socModelProvider = { "unknown" }),
    )

    assertEquals(MlExecutionTarget.CPU, plan.speech)
    assertEquals(MlExecutionTarget.GPU, plan.interpretation)
  }
}
