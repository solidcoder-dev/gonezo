package dev.solidcoder.interpretation.json

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
import dev.solidcoder.interpretation.domain.InterpretationIssueLevel
import dev.solidcoder.interpretation.domain.InterpretationResult
import dev.solidcoder.interpretation.domain.InterpretationSpec
import dev.solidcoder.interpretation.domain.InterpretationSpecId
import dev.solidcoder.interpretation.domain.InterpretationSpecVersion
import dev.solidcoder.interpretation.domain.StructuredValue
import java.nio.file.Path
import kotlin.io.path.readText
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.json.JSONObject
import org.junit.jupiter.api.Test

class InterpretationJsonCodecTest {
  private val codec = InterpretationJsonCodec()

  @Test
  fun `decodes the shared request fixture and round trips without losing semantics`() {
    val fixture = readFixture("interpretation-request.1.json")

    val decoded = codec.decodeRequest(fixture)

    assertThat(decoded.input.value).isEqualTo("Gasté 34,80 euros ayer en comida")
    assertThat(decoded.inputLanguage).isEqualTo("es")
    assertThat(decoded.spec.id.value).isEqualTo("gonezo-movement-entry")
    assertThat(decoded.spec.version.value).isEqualTo("1")
    assertThat(decoded.spec.fields).extracting<String> { it.key.value }.containsExactly("type", "amount")

    val typeField = decoded.spec.fields.first { it.key.value == "type" }
    assertThat(typeField.type).isEqualTo(FieldType.ENUM)
    assertThat(typeField.allowedValues).containsExactly(
      AllowedValue("expense", "Expense"),
      AllowedValue("income", "Income"),
    )

    val currentDate = contextEntry(decoded.context, "currentDate")
    assertThat(currentDate.value).isEqualTo(StructuredValue.Date(java.time.LocalDate.parse("2026-07-16")))
    assertThat(contextEntry(decoded.context, "timeZone").value).isEqualTo(StructuredValue.Text("Atlantic/Canary"))
    assertThat(contextEntry(decoded.context, "locale").value).isEqualTo(StructuredValue.Text("es-ES"))
    assertThat(contextEntry(decoded.context, "currency").value).isEqualTo(StructuredValue.Text("EUR"))

    val encoded = codec.encodeRequest(decoded)
    assertThat(codec.decodeRequest(encoded)).isEqualTo(decoded)
  }

  @Test
  fun `decodes the shared result fixture and preserves warning levels`() {
    val fixture = readFixture("interpretation-result.1.json")

    val decoded = codec.decodeResult(fixture)
    val encoded = codec.encodeResult(decoded)

    assertThat(decoded.specId.value).isEqualTo("gonezo-movement-entry")
    assertThat(decoded.specVersion.value).isEqualTo("1")
    assertThat(decoded.fields).hasSize(1)
    assertThat(decoded.fields.first().key.value).isEqualTo("amount")
    assertThat(decoded.fields.first().interpretation).isInstanceOf(dev.solidcoder.interpretation.domain.FieldInterpretation.Resolved::class.java)
    assertThat((decoded.fields.first().interpretation as dev.solidcoder.interpretation.domain.FieldInterpretation.Resolved).candidate.value)
      .isEqualTo(StructuredValue.Decimal(java.math.BigDecimal("34.80")))
    assertThat((decoded.fields.first().interpretation as dev.solidcoder.interpretation.domain.FieldInterpretation.Resolved).candidate.confidence.value)
      .isEqualTo(0.92)
    assertThat((decoded.fields.first().interpretation as dev.solidcoder.interpretation.domain.FieldInterpretation.Resolved).candidate.rationale)
      .isEqualTo("Explicit amount")
    assertThat(decoded.issues).containsExactly(
      dev.solidcoder.interpretation.domain.InterpretationIssue(
        code = "example-warning",
        message = "Example warning",
        level = InterpretationIssueLevel.WARNING,
      ),
    )
    assertThat(JSONObject(encoded).toMap()).isEqualTo(JSONObject(fixture).toMap())
  }

  @Test
  fun `rejects incompatible request shapes`() {
    assertThatThrownBy {
      codec.decodeRequest("""{"contractVersion":"1","input":"hola","spec":{"id":"gonezo-movement-entry","version":"1","fields":[]},"context":{"entries":[]}}""")
    }.isInstanceOf(IllegalArgumentException::class.java)

    assertThatThrownBy {
      codec.decodeRequest("""{"contractVersion":"1","input":"hola","spec":{"contractVersion":"1","specId":"gonezo-movement-entry","version":"1","fields":[{"key":"amount","description":"Amount","type":"decimal","required":false}]},"context":{"entries":[]}}""")
    }.isInstanceOf(IllegalArgumentException::class.java)

    assertThatThrownBy {
      codec.decodeRequest("""{"contractVersion":"1","input":"hola","spec":{"contractVersion":"1","specId":"gonezo-movement-entry","version":"1","fields":[{"key":"amount","description":"Amount","type":"DECIMAL","required":false}],"unexpected":true},"context":{"entries":[]}}""")
    }.isInstanceOf(IllegalArgumentException::class.java)

    assertThatThrownBy {
      codec.decodeRequest("""{"contractVersion":"1","input":"hola","spec":{"contractVersion":"1","specId":"gonezo-movement-entry","version":"1","fields":[{"key":"amount","description":"Amount","type":"DECIMAL","required":false}]},"context":{"entries":[{"key":"currentDate","value":{"value":"2026-07-16"}}]}}""")
    }.isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `rejects invalid result payloads`() {
    assertThatThrownBy {
      codec.decodeResult("""{"contractVersion":"1","specId":"purchase","version":"1","fields":[],"unexpected":true}""")
    }.isInstanceOf(IllegalArgumentException::class.java)

    assertThatThrownBy {
      codec.decodeResult("""{"contractVersion":"1","specId":"purchase","version":"1","fields":[{"key":"amount","interpretation":{"kind":"resolved","candidate":{"value":{"type":"decimal","value":"1.23"},"confidence":1.2}}}],"issues":[]}""")
    }.isInstanceOf(IllegalArgumentException::class.java)

    assertThatThrownBy {
      codec.decodeResult("""{"contractVersion":"1","specId":"purchase","version":"1","fields":[{"key":"type","interpretation":{"kind":"resolved","candidate":{"value":{"type":"enum","value":"alpha"},"confidence":0.9}}},{"key":"type","interpretation":{"kind":"resolved","candidate":{"value":{"type":"enum","value":"beta"},"confidence":0.9}}}],"issues":[]}""")
    }.isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `decodes field interpretations with strict keys`() {
    assertThat(codec.decodeFieldInterpretation("""{"kind":"missing"}""")).isEqualTo(dev.solidcoder.interpretation.domain.FieldInterpretation.Missing)

    assertThatThrownBy {
      codec.decodeFieldInterpretation("""{"kind":"resolved","candidate":{"value":{"type":"decimal","value":"1.23"},"confidence":0.9},"unexpected":true}""")
    }.isInstanceOf(IllegalArgumentException::class.java)
  }

  private fun readFixture(name: String): String = Path.of("src/test/resources/fixtures/$name").readText()

  private fun contextEntry(context: InterpretationContext, key: String): ContextEntry =
    context.entries.first { it.key.value == key }
}
