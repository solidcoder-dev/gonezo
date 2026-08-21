package com.gonezo.multiplatform.plugins.interpretation

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.gonezo.multiplatform.plugins.interpretation.bootstrap.SchemaGuidedInterpretationCompositionRoot
import com.gonezo.multiplatform.plugins.ml.AndroidDeviceMlCapabilities
import com.gonezo.multiplatform.plugins.ml.MlExecutionPlanFactory
import com.gonezo.multiplatform.plugins.ml.MlExecutionTarget
import dev.solidcoder.interpretation.application.StructuredGenerationRequest
import dev.solidcoder.interpretation.domain.FieldDescription
import dev.solidcoder.interpretation.domain.FieldKey
import dev.solidcoder.interpretation.domain.FieldSpec
import dev.solidcoder.interpretation.domain.FieldType
import dev.solidcoder.interpretation.domain.InterpretationSpec
import dev.solidcoder.interpretation.domain.InterpretationSpecId
import dev.solidcoder.interpretation.domain.InterpretationSpecVersion
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class Sm8850NpuSmokeTest {
  @Test
  fun initializesNpuLoadsTheSm8850ModelAndGenerates() = runBlocking {
    val plan = MlExecutionPlanFactory().create(AndroidDeviceMlCapabilities())
    assumeTrue("Run this manual test on an SM8850 device.", plan.interpretation == MlExecutionTarget.NPU)

    val context = InstrumentationRegistry.getInstrumentation().targetContext
    val root = SchemaGuidedInterpretationCompositionRoot(context)
    try {
      assertEquals(MlExecutionTarget.CPU, root.executionPlan.speech)
      assertEquals(MlExecutionTarget.NPU, root.executionPlan.interpretation)
      assertEquals(MlExecutionTarget.NPU, root.modelConfiguration.target)
      assertFalse(root.modelConfiguration.fileName.contains("multi-prefill"))

      val result = root.runtime.generate(
        StructuredGenerationRequest(
          prompt = "Return JSON with ok true.",
          spec = InterpretationSpec(
            id = InterpretationSpecId.of("sm8850-smoke"),
            version = InterpretationSpecVersion.of("1"),
            fields = listOf(
              FieldSpec(
                key = FieldKey.of("ok"),
                description = FieldDescription.of("Whether the smoke test succeeded"),
                type = FieldType.BOOLEAN,
              ),
            ),
          ),
        ),
      )

      assertTrue(result.output.isNotBlank())
    } finally {
      root.close()
    }
  }
}
