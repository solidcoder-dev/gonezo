package com.gonezo.multiplatform.plugins.interpretation

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.gonezo.multiplatform.infrastructure.ml.MlExecutionTarget
import com.gonezo.multiplatform.plugins.interpretation.bootstrap.SchemaGuidedInterpretationCompositionRoot
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationRequest
import dev.solidcoder.interpretation.domain.FieldDescription
import dev.solidcoder.interpretation.domain.FieldKey
import dev.solidcoder.interpretation.domain.FieldSpec
import dev.solidcoder.interpretation.domain.FieldType
import dev.solidcoder.interpretation.domain.InterpretationSpec
import dev.solidcoder.interpretation.domain.InterpretationSpecId
import dev.solidcoder.interpretation.domain.InterpretationSpecVersion
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class Sm8750NpuSmokeTest {
  @Test
  fun initializesConversationAndGeneratesFive() = runBlocking {
    val context = InstrumentationRegistry.getInstrumentation().targetContext
    val root = SchemaGuidedInterpretationCompositionRoot(context)
    assumeTrue("Run this manual test on a Samsung SM8750 device.", root.executionPlan.interpretation == MlExecutionTarget.NPU)

    try {
      assertEquals(MlExecutionTarget.NPU, root.executionPlan.interpretation)
      assertTrue(root.modelConfiguration.fileName.contains("sm8750"))

      val result = root.runtime.generate(
        StructuredGenerationRequest(
          prompt = "Return the number 5.",
          spec = InterpretationSpec(
            id = InterpretationSpecId.of("sm8750-npu-smoke"),
            version = InterpretationSpecVersion.of("1"),
            fields = listOf(
              FieldSpec(
                key = FieldKey.of("number"),
                description = FieldDescription.of("The number returned by the smoke prompt"),
                type = FieldType.INTEGER,
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
