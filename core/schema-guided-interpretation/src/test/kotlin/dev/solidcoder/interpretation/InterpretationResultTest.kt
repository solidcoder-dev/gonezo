package dev.solidcoder.interpretation

import dev.solidcoder.interpretation.domain.AllowedValue
import dev.solidcoder.interpretation.domain.Confidence
import dev.solidcoder.interpretation.domain.FieldCandidate
import dev.solidcoder.interpretation.domain.FieldDescription
import dev.solidcoder.interpretation.domain.FieldInterpretation
import dev.solidcoder.interpretation.domain.FieldKey
import dev.solidcoder.interpretation.domain.FieldResult
import dev.solidcoder.interpretation.domain.FieldSpec
import dev.solidcoder.interpretation.domain.FieldType
import dev.solidcoder.interpretation.domain.InterpretationIssue
import dev.solidcoder.interpretation.domain.InterpretationResult
import dev.solidcoder.interpretation.domain.InterpretationSpec
import dev.solidcoder.interpretation.domain.InterpretationSpecId
import dev.solidcoder.interpretation.domain.InterpretationSpecVersion
import dev.solidcoder.interpretation.domain.StructuredValue
import java.math.BigDecimal
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class InterpretationResultTest {

  @Test
  fun `accepts a result with missing fields`() {
    val result = InterpretationResult.forSpec(
      spec = sampleSpec(),
      candidates = mapOf("type" to enumCandidate("alpha")),
    )

    assertThat(result.fields).hasSize(2)
    assertThat(result.fields.single { it.key == FieldKey.of("amount") }.interpretation).isEqualTo(FieldInterpretation.Missing)
  }

  @Test
  fun `rejects results with unknown fields`() {
    assertThatThrownBy {
      InterpretationResult.forSpec(
        spec = sampleSpec(),
        candidates = mapOf(
          "type" to enumCandidate("alpha"),
          "note" to FieldCandidate(StructuredValue.Text("x"), Confidence.of(0.8)),
        ),
      )
    }.isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `rejects results that omit a requested key`() {
    assertThatThrownBy {
      InterpretationResult.forSpec(
        spec = sampleSpec(),
        fields = listOf(
          FieldResult(FieldKey.of("type"), FieldInterpretation.Resolved(enumCandidate("alpha"))),
        ),
      )
    }.isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `rejects results with repeated keys`() {
    assertThatThrownBy {
      InterpretationResult.forSpec(
        spec = sampleSpec(),
        fields = listOf(
          FieldResult(FieldKey.of("type"), FieldInterpretation.Resolved(enumCandidate("alpha"))),
          FieldResult(FieldKey.of("type"), FieldInterpretation.Missing),
        ),
      )
    }.isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `rejects candidates incompatible with their field type`() {
    assertThatThrownBy {
      InterpretationResult.forSpec(
        spec = sampleSpec(),
        candidates = mapOf("type" to FieldCandidate(StructuredValue.Decimal(BigDecimal("12.34")), Confidence.of(0.8))),
      )
    }.isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `rejects enum values outside the allowed values`() {
    assertThatThrownBy {
      InterpretationResult.forSpec(
        spec = sampleSpec(),
        candidates = mapOf("type" to enumCandidate("gamma")),
      )
    }.isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `conserves the spec id and version`() {
    val spec = sampleSpec()

    val result = InterpretationResult.forSpec(
      spec = spec,
      candidates = mapOf(
        "type" to enumCandidate("alpha"),
        "amount" to FieldCandidate(
          value = StructuredValue.Decimal(BigDecimal("15.00")),
          confidence = Confidence.of(0.9),
        ),
      ),
      issues = listOf(InterpretationIssue(code = "partial_context", message = "Context was limited")),
    )

    assertThat(result.specId).isEqualTo(spec.id)
    assertThat(result.specVersion).isEqualTo(spec.version)
  }

  private fun sampleSpec(): InterpretationSpec = InterpretationSpec(
    id = InterpretationSpecId.of("purchase"),
    version = InterpretationSpecVersion.of("1"),
    fields = listOf(
      FieldSpec(
        key = FieldKey.of("type"),
        description = FieldDescription.of("Choice direction"),
        type = FieldType.ENUM,
        allowedValues = listOf(
          AllowedValue("alpha", "Alpha"),
          AllowedValue("beta", "Beta"),
        ),
      ),
      FieldSpec(
        key = FieldKey.of("amount"),
        description = FieldDescription.of("Quantity"),
        type = FieldType.DECIMAL,
      ),
    ),
  )

  private fun enumCandidate(stableValue: String): FieldCandidate = FieldCandidate(
    value = StructuredValue.Enum(stableValue),
    confidence = Confidence.of(0.75),
  )
}
