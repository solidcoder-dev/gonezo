package dev.solidcoder.interpretation.json

import dev.solidcoder.interpretation.application.FieldOutputDecodingException
import dev.solidcoder.interpretation.application.FieldOutputViolation
import dev.solidcoder.interpretation.application.StructuredGenerationResult
import dev.solidcoder.interpretation.domain.AllowedValue
import dev.solidcoder.interpretation.domain.FieldDescription
import dev.solidcoder.interpretation.domain.FieldInterpretation
import dev.solidcoder.interpretation.domain.FieldKey
import dev.solidcoder.interpretation.domain.FieldSpec
import dev.solidcoder.interpretation.domain.FieldType
import dev.solidcoder.interpretation.domain.StructuredValue
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class JsonFieldInterpretationResultDecoderTest {
  private val decoder = JsonFieldInterpretationResultDecoder()

  @Test
  fun `decodes supported value types including decimal number and string`() {
    assertThat(
      decoder.decode(
        field = enumField(),
        generationResult = StructuredGenerationResult("""{"kind":"resolved","value":"v0","confidence":0.98}"""),
      ),
    ).isEqualTo(FieldInterpretation.Resolved(candidateEnum("transport", 0.98)))

    assertThat(
      decoder.decode(
        field = amountField(),
        generationResult = StructuredGenerationResult("""{"kind":"resolved","value":5,"confidence":0.97}"""),
      ),
    ).isEqualTo(FieldInterpretation.Resolved(candidateDecimal("5", 0.97)))

    assertThat(
      decoder.decode(
        field = amountField(),
        generationResult = StructuredGenerationResult("""{"kind":"resolved","value":"12.50","confidence":0.97}"""),
      ),
    ).isEqualTo(FieldInterpretation.Resolved(candidateDecimal("12.50", 0.97)))

    assertThat(
      decoder.decode(
        field = textField(),
        generationResult = StructuredGenerationResult("""{"kind":"resolved","value":"hello","confidence":0.91}"""),
      ),
    ).isEqualTo(FieldInterpretation.Resolved(candidateText("hello", 0.91)))

    assertThat(
      decoder.decode(
        field = dateField(),
        generationResult = StructuredGenerationResult("""{"kind":"resolved","value":"2026-07-14","confidence":0.88}"""),
      ),
    ).isEqualTo(FieldInterpretation.Resolved(candidateDate("2026-07-14", 0.88)))

    assertThat(
      decoder.decode(
        field = booleanField(),
        generationResult = StructuredGenerationResult("""{"kind":"resolved","value":true,"confidence":0.77}"""),
      ),
    ).isEqualTo(FieldInterpretation.Resolved(candidateBoolean(true, 0.77)))

    assertThat(
      decoder.decode(
        field = integerField(),
        generationResult = StructuredGenerationResult("""{"kind":"resolved","value":12,"confidence":0.66}"""),
      ),
    ).isEqualTo(FieldInterpretation.Resolved(candidateInteger(12, 0.66)))
  }

  @Test
  fun `decodes missing and ambiguous payloads`() {
    assertThat(
      decoder.decode(
        field = amountField(),
        generationResult = StructuredGenerationResult("""{"kind":"missing"}"""),
      ),
    ).isEqualTo(FieldInterpretation.Missing)

    assertThat(
      decoder.decode(
        field = enumField(),
        generationResult = StructuredGenerationResult("""{"kind":"ambiguous","candidates":[{"value":"v0","confidence":0.6},{"value":"v1","confidence":0.4}]}"""),
      ),
    ).isEqualTo(
      FieldInterpretation.Ambiguous(
        listOf(
          candidateEnum("transport", 0.60),
          candidateEnum("food", 0.40),
        ),
      ),
    )
  }

  @Test
  fun `maps expected decoding failures to typed violations`() {
    assertViolation("{", amountField(), FieldOutputViolation.INVALID_JSON)
    assertViolation("""{"amount":20}""", amountField(), FieldOutputViolation.WRONG_PROPERTIES)
    assertViolation("""{"alias":"v0","label":"Expense"}""", enumField(), FieldOutputViolation.WRONG_PROPERTIES)
    assertViolation("""{"resolved object uses exactly the keys kind, value, confidence":{"note":"20 euros en gasolina"}}""", amountField(), FieldOutputViolation.WRONG_PROPERTIES)
    assertViolation("""{"kind":"missing","value":"20 euros en gasolina","confidence":1}""", amountField(), FieldOutputViolation.WRONG_PROPERTIES)
    assertViolation("""{"kind":true}""", amountField(), FieldOutputViolation.INVALID_KIND_SHAPE)
    assertViolation("""{"kind":"merged"}""", amountField(), FieldOutputViolation.UNKNOWN_KIND)
    assertViolation("""{"kind":"resolved","value":{"amount":12.50},"confidence":0.98}""", amountField(), FieldOutputViolation.INVALID_VALUE_TYPE)
    assertViolation("""{"kind":"resolved","value":["12.50"],"confidence":0.98}""", amountField(), FieldOutputViolation.INVALID_VALUE_TYPE)
    assertViolation("""{"kind":"resolved","value":"not-a-number","confidence":0.98}""", amountField(), FieldOutputViolation.INVALID_VALUE_TYPE)
    assertViolation("""{"kind":"resolved","value":"NaN","confidence":0.98}""", amountField(), FieldOutputViolation.INVALID_VALUE_TYPE)
    assertViolation("""{"kind":"resolved","value":"Infinity","confidence":0.98}""", amountField(), FieldOutputViolation.INVALID_VALUE_TYPE)
    assertViolation("""{"kind":"resolved","value":"v9","confidence":0.98}""", enumField(), FieldOutputViolation.UNKNOWN_ENUM_ALIAS)
    assertViolation("""{"kind":"resolved","value":"v0","confidence":1.2}""", enumField(), FieldOutputViolation.INVALID_CONFIDENCE)
    assertViolation("""{"kind":"resolved","value":"2026-13-01","confidence":0.91}""", dateField(), FieldOutputViolation.INVALID_DATE)
    assertViolation("""{"kind":"ambiguous","candidates":[{"value":"v0","confidence":0.6}]}""", enumField(), FieldOutputViolation.INVALID_CANDIDATES)
    assertViolation("""{"kind":"ambiguous","candidates":[{"value":"v0","confidence":0.6},{"value":"v0","confidence":0.4}]}""", enumField(), FieldOutputViolation.INVALID_CANDIDATES)
  }

  private fun assertViolation(json: String, field: FieldSpec, violation: FieldOutputViolation) {
    assertThatThrownBy {
      decoder.decode(
        field = field,
        generationResult = StructuredGenerationResult(json),
      )
    }
      .isInstanceOf(FieldOutputDecodingException::class.java)
      .isInstanceOfSatisfying(FieldOutputDecodingException::class.java) { throwable ->
        assertThat(throwable.violation).isEqualTo(violation)
      }
  }

  private fun enumField(): FieldSpec = FieldSpec(
    key = FieldKey.of("categoryId"),
    description = FieldDescription.of("Best matching category identifier among the supplied category candidates"),
    type = FieldType.ENUM,
    allowedValues = listOf(
      AllowedValue("transport", "Transport", "Taxi, bus, train, or other transport costs"),
      AllowedValue("food", "Food", "Meals and groceries"),
    ),
  )

  private fun amountField(): FieldSpec = FieldSpec(
    key = FieldKey.of("amount"),
    description = FieldDescription.of("Monetary amount explicitly mentioned by the user"),
    type = FieldType.DECIMAL,
  )

  private fun textField(): FieldSpec = FieldSpec(
    key = FieldKey.of("note"),
    description = FieldDescription.of("Short note describing the movement"),
    type = FieldType.TEXT,
  )

  private fun dateField(): FieldSpec = FieldSpec(
    key = FieldKey.of("occurredOn"),
    description = FieldDescription.of("Date when the event happened"),
    type = FieldType.DATE,
    required = true,
    format = "local-date",
  )

  private fun booleanField(): FieldSpec = FieldSpec(
    key = FieldKey.of("isRecurring"),
    description = FieldDescription.of("Whether the movement repeats"),
    type = FieldType.BOOLEAN,
  )

  private fun integerField(): FieldSpec = FieldSpec(
    key = FieldKey.of("installments"),
    description = FieldDescription.of("Number of installments"),
    type = FieldType.INTEGER,
  )

  private fun candidateEnum(stableValue: String, confidence: Double) = dev.solidcoder.interpretation.domain.FieldCandidate(
    value = StructuredValue.Enum(stableValue),
    confidence = dev.solidcoder.interpretation.domain.Confidence.of(confidence),
  )

  private fun candidateDecimal(value: String, confidence: Double) = dev.solidcoder.interpretation.domain.FieldCandidate(
    value = StructuredValue.Decimal(java.math.BigDecimal(value)),
    confidence = dev.solidcoder.interpretation.domain.Confidence.of(confidence),
  )

  private fun candidateText(value: String, confidence: Double) = dev.solidcoder.interpretation.domain.FieldCandidate(
    value = StructuredValue.Text(value),
    confidence = dev.solidcoder.interpretation.domain.Confidence.of(confidence),
  )

  private fun candidateDate(value: String, confidence: Double) = dev.solidcoder.interpretation.domain.FieldCandidate(
    value = StructuredValue.Date(java.time.LocalDate.parse(value)),
    confidence = dev.solidcoder.interpretation.domain.Confidence.of(confidence),
  )

  private fun candidateBoolean(value: Boolean, confidence: Double) = dev.solidcoder.interpretation.domain.FieldCandidate(
    value = StructuredValue.BooleanValue(value),
    confidence = dev.solidcoder.interpretation.domain.Confidence.of(confidence),
  )

  private fun candidateInteger(value: Long, confidence: Double) = dev.solidcoder.interpretation.domain.FieldCandidate(
    value = StructuredValue.Integer(value),
    confidence = dev.solidcoder.interpretation.domain.Confidence.of(confidence),
  )
}
