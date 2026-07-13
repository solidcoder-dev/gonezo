package dev.solidcoder.interpretation

import dev.solidcoder.interpretation.domain.ContextEntry
import dev.solidcoder.interpretation.domain.ContextKey
import dev.solidcoder.interpretation.domain.InterpretationContext
import dev.solidcoder.interpretation.domain.StructuredValue
import java.time.LocalDate
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class InterpretationContextTest {

  @Test
  fun `context carries typed entries without prescribing global names`() {
    val context = InterpretationContext(
      entries = listOf(
        ContextEntry(ContextKey.of("currentDate"), StructuredValue.Date(LocalDate.of(2026, 7, 13))),
        ContextEntry(ContextKey.of("timeZone"), StructuredValue.Text("Europe/London")),
        ContextEntry(ContextKey.of("locale"), StructuredValue.Text("es-ES")),
        ContextEntry(ContextKey.of("currency"), StructuredValue.Text("EUR")),
      ),
    )

    assertThat(context.valueOf(ContextKey.of("timeZone"))).isEqualTo(StructuredValue.Text("Europe/London"))
  }

  @Test
  fun `rejects duplicate context keys`() {
    assertThatThrownBy {
      InterpretationContext(
        entries = listOf(
          ContextEntry(ContextKey.of("timeZone"), StructuredValue.Text("Europe/London")),
          ContextEntry(ContextKey.of("timeZone"), StructuredValue.Text("UTC")),
        ),
      )
    }.isInstanceOf(IllegalArgumentException::class.java)
  }
}
