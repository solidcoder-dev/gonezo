package dev.solidcoder.interpretation.json

import dev.solidcoder.interpretation.application.FieldPromptVariant
import dev.solidcoder.interpretation.application.FieldOutputViolation
import dev.solidcoder.interpretation.application.InterpretationRequest
import dev.solidcoder.interpretation.application.InputSource
import dev.solidcoder.interpretation.domain.AllowedValue
import dev.solidcoder.interpretation.domain.ContextEntry
import dev.solidcoder.interpretation.domain.ContextKey
import dev.solidcoder.interpretation.domain.FieldDescription
import dev.solidcoder.interpretation.domain.FieldKey
import dev.solidcoder.interpretation.domain.FieldSpec
import dev.solidcoder.interpretation.domain.FieldType
import dev.solidcoder.interpretation.domain.InterpretationContext
import dev.solidcoder.interpretation.domain.InterpretationSpec
import dev.solidcoder.interpretation.domain.InterpretationSpecId
import dev.solidcoder.interpretation.domain.InterpretationSpecVersion
import dev.solidcoder.interpretation.domain.StructuredValue
import java.time.LocalDate
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class JsonFieldInterpretationPromptCompilerTest {
  private val compiler = JsonFieldInterpretationPromptCompiler()

  @Test
  fun `builds a prompt for only the current field`() {
    val request = request()

    val amountPrompt = compiler.compile(request, amountField(), FieldPromptVariant.PRIMARY).prompt
    val datePrompt = compiler.compile(request, dateField(), FieldPromptVariant.PRIMARY).prompt
    val categoryPrompt = compiler.compile(request, categoryField(), FieldPromptVariant.PRIMARY).prompt
    val retryPrompt = compiler.compile(request, amountField(), FieldPromptVariant.FORMAT_RETRY, FieldOutputViolation.WRONG_PROPERTIES).prompt

    assertThat(amountPrompt).contains("inputLanguage: es")
    assertThat(amountPrompt).contains("input: 20 euros de gasolina 95")
    assertThat(amountPrompt).contains("fieldKey: amount")
    assertThat(amountPrompt).contains("fieldDescription: Monetary amount explicitly mentioned by the user")
    assertThat(amountPrompt).contains("fieldType: decimal")
    assertThat(amountPrompt).contains("required: false")
    assertThat(amountPrompt).contains("context: currency=EUR; locale=es-ES")
    assertThat(amountPrompt).contains("Allowed output shapes:")
    assertThat(amountPrompt).contains("""{"kind":"resolved","value":VALUE,"confidence":CONFIDENCE}""")
    assertThat(amountPrompt).contains("""{"kind":"missing"}""")
    assertThat(amountPrompt).contains("""{"kind":"ambiguous","candidates":[{"value":VALUE,"confidence":CONFIDENCE},{"value":VALUE,"confidence":CONFIDENCE}]}""")
    assertThat(amountPrompt).contains("Replace VALUE with a value of the required field type.")
    assertThat(amountPrompt).contains("Replace CONFIDENCE with a JSON number between 0 and 1.")
    assertThat(amountPrompt).contains("Decimal fields must extract only the monetary amount")
    assertThat(amountPrompt).contains("Ignore product numbers, quantities, or indices such as the 95 in gasolina 95")
    assertThat(amountPrompt).doesNotContain("specId")
    assertThat(amountPrompt).doesNotContain("requestId")
    assertThat(amountPrompt).doesNotContain("categoryId")
    assertThat(amountPrompt).doesNotContain("value: ...")
    assertThat(amountPrompt).doesNotContain("value:\"\"")
    assertThat(amountPrompt).doesNotContain("confidence: 0.98")
    assertThat(amountPrompt).doesNotContain("```")

    assertThat(datePrompt).contains("fieldKey: occurredOn")
    assertThat(datePrompt).contains("fieldType: date")
    assertThat(datePrompt).contains("context: currentDate=2026-07-15; timeZone=Europe/London")
    assertThat(datePrompt).doesNotContain("currency=EUR")
    assertThat(datePrompt).doesNotContain("locale=es-ES")
    assertThat(datePrompt).contains("Date fields must use an ISO yyyy-MM-dd string only when the text contains temporal evidence")
    assertThat(datePrompt).contains("If there is no date, today, yesterday, or other temporal evidence, return exactly {\"kind\":\"missing\"}")
    assertThat(datePrompt).doesNotContain("currentDate as default")

    assertThat(categoryPrompt).contains("fieldKey: categoryId")
    assertThat(categoryPrompt).contains("fieldType: enum")
    assertThat(categoryPrompt).contains("""Allowed aliases:""")
    assertThat(categoryPrompt).contains("""v0 = Dining""")
    assertThat(categoryPrompt).contains("""v1 = Transport""")
    assertThat(categoryPrompt).doesNotContain("Meals and groceries")
    assertThat(categoryPrompt).doesNotContain("Public transport and taxis")
    assertThat(categoryPrompt).contains("Enum fields must choose only one of the listed aliases")
    assertThat(categoryPrompt).contains("Use labels only to choose the value")
    assertThat(categoryPrompt).contains("Return only the selected alias as the value of the required result object")
    assertThat(categoryPrompt).contains("If no alias can be selected, return missing or ambiguous")
    assertThat(categoryPrompt).contains("inputLanguage: es")
    assertThat(categoryPrompt).doesNotContain("transport-cat")
    assertThat(categoryPrompt).doesNotContain("stableValue")
    assertThat(categoryPrompt).doesNotContain("""{"kind":"resolved","value":"v0","confidence":0.98}""")
    assertThat(categoryPrompt).doesNotContain("confidence: 0.98")
    assertThat(categoryPrompt).doesNotContain("```")

    assertThat(retryPrompt).isNotEqualTo(amountPrompt)
    assertThat(retryPrompt).contains("The previous response was invalid.")
    assertThat(retryPrompt).contains("Use only the properties allowed by the contract.")
    assertThat(retryPrompt).contains("fieldType: decimal")
    assertThat(retryPrompt).contains("""{"kind":"resolved","value":VALUE,"confidence":CONFIDENCE}""")
    assertThat(retryPrompt).doesNotContain("The answer above")
    assertThat(retryPrompt).doesNotContain("20 euros de gasolina 95")
    assertThat(retryPrompt).doesNotContain("confidence: 0.98")
    assertThat(retryPrompt).doesNotContain("```")
  }

  @Test
  fun `is deterministic for the same field`() {
    val request = request()

    val first = compiler.compile(request, amountField(), FieldPromptVariant.PRIMARY).prompt
    val second = compiler.compile(request, amountField(), FieldPromptVariant.PRIMARY).prompt

    assertThat(first).isEqualTo(second)
  }

  @Test
  fun `builds a shorter format retry prompt`() {
    val request = request()

    val primary = compiler.compile(request, amountField(), FieldPromptVariant.PRIMARY).prompt
    val prompt = compiler.compile(request, amountField(), FieldPromptVariant.FORMAT_RETRY, FieldOutputViolation.INVALID_JSON).prompt

    assertThat(prompt).isNotEqualTo(primary)
    assertThat(prompt).contains("The previous response was invalid.")
    assertThat(prompt).contains("Return a single valid JSON object.")
    assertThat(prompt).contains("fieldType: decimal")
    assertThat(prompt).contains("""{"kind":"resolved","value":VALUE,"confidence":CONFIDENCE}""")
    assertThat(prompt).doesNotContain("confidence: 0.98")
    assertThat(prompt).doesNotContain("value: ...")
    assertThat(prompt).doesNotContain("```")
  }

  private fun request(): InterpretationRequest = InterpretationRequest(
    input = InputSource.of("20 euros de gasolina 95"),
    inputLanguage = "es",
    spec = InterpretationSpec(
      id = InterpretationSpecId.of("gonezo-movement-entry"),
      version = InterpretationSpecVersion.of("1"),
      fields = listOf(
        amountField(),
        categoryField(),
      ),
    ),
    context = InterpretationContext(
      entries = listOf(
        ContextEntry(ContextKey.of("inputLanguage"), StructuredValue.Text("es")),
        ContextEntry(ContextKey.of("currentDate"), StructuredValue.Date(LocalDate.parse("2026-07-15"))),
        ContextEntry(ContextKey.of("timeZone"), StructuredValue.Text("Europe/London")),
        ContextEntry(ContextKey.of("locale"), StructuredValue.Text("es-ES")),
        ContextEntry(ContextKey.of("currency"), StructuredValue.Text("EUR")),
      ),
    ),
  )

  private fun amountField() = FieldSpec(
    key = FieldKey.of("amount"),
    description = FieldDescription.of("Monetary amount explicitly mentioned by the user"),
    type = FieldType.DECIMAL,
  )

  private fun categoryField() = FieldSpec(
    key = FieldKey.of("categoryId"),
    description = FieldDescription.of("Best matching category identifier among the supplied category candidates"),
    type = FieldType.ENUM,
    allowedValues = listOf(
      AllowedValue("dining-uuid-1", "Dining", "Meals and groceries"),
      AllowedValue("transport-cat", "Transport", "Public transport and taxis"),
    ),
  )

  private fun dateField() = FieldSpec(
    key = FieldKey.of("occurredOn"),
    description = FieldDescription.of("Date when the event happened"),
    type = FieldType.DATE,
    required = true,
    format = "local-date",
  )
}
