package com.gonezo.multiplatform.infrastructure.processing.isolation

import dev.solidcoder.interpretation.application.FieldPromptVariant
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationRequest
import dev.solidcoder.interpretation.domain.AllowedValue
import dev.solidcoder.interpretation.domain.FieldDescription
import dev.solidcoder.interpretation.domain.FieldKey
import dev.solidcoder.interpretation.domain.FieldSpec
import dev.solidcoder.interpretation.domain.FieldType
import dev.solidcoder.interpretation.domain.InterpretationSpec
import dev.solidcoder.interpretation.domain.InterpretationSpecId
import dev.solidcoder.interpretation.domain.InterpretationSpecVersion
import org.junit.Assert.assertEquals
import org.junit.Test

class StructuredGenerationRequestCodecTest {
  @Test
  fun `round trips the complete structured generation request across the worker boundary`() {
    val request = StructuredGenerationRequest(
      prompt = "interpret this field",
      spec = InterpretationSpec(
        id = InterpretationSpecId.of("movement-entry"),
        version = InterpretationSpecVersion.of("2"),
        fields = listOf(
          FieldSpec(
            key = FieldKey.of("categoryId"),
            description = FieldDescription.of("Category"),
            type = FieldType.ENUM,
            allowedValues = listOf(
              AllowedValue("fuel", "Fuel", "Fuel expenses"),
              AllowedValue("food", "Food"),
            ),
            required = true,
            format = "stable-id",
          ),
        ),
      ),
      fieldKey = "categoryId",
      fieldIndex = 2,
      attemptNumber = 2,
      promptVariant = FieldPromptVariant.FORMAT_RETRY,
      generationTimeoutMs = 15_000,
    )

    val decoded = StructuredGenerationRequestCodec.decodeJson(StructuredGenerationRequestCodec.encodeJson(request))

    assertEquals(request, decoded)
  }
}
