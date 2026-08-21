package com.gonezo.multiplatform.infrastructure.ml

import org.junit.Assert.assertEquals
import org.junit.Test

class AndroidSocResolverTest {
  @Test
  fun `maps normalized SM8850 identifiers to the Qualcomm target`() {
    listOf("SM8850", " sm8850 ", "SM8850-AC", "SM8850-1-AD").forEach { rawValue ->
      assertEquals(NpuTarget.QUALCOMM_SM8850, KnownAndroidSocResolver.resolve(rawValue))
    }
  }

  @Test
  fun `maps SM8750 to its Qualcomm target`() {
    listOf("SM8750", " sm8750 ", "SM8750-AC").forEach { rawValue ->
      assertEquals(NpuTarget.QUALCOMM_SM8750, KnownAndroidSocResolver.resolve(rawValue))
    }
  }

  @Test
  fun `does not resolve unknown or missing identifiers`() {
    assertEquals(null, KnownAndroidSocResolver.resolve("unknown"))
    assertEquals(null, KnownAndroidSocResolver.resolve(null))
  }
}
