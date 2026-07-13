package dev.solidcoder.interpretation

import dev.solidcoder.interpretation.domain.Confidence
import dev.solidcoder.interpretation.domain.FieldCandidate
import dev.solidcoder.interpretation.domain.FieldInterpretation
import dev.solidcoder.interpretation.domain.StructuredValue
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class ConfidenceAndInterpretationTest {

  @Test
  fun `accepts confidence boundaries`() {
    assertThat(Confidence.of(0.0).value).isEqualTo(0.0)
    assertThat(Confidence.of(1.0).value).isEqualTo(1.0)
  }

  @Test
  fun `rejects confidence outside boundaries`() {
    assertThatThrownBy { Confidence.of(-0.01) }.isInstanceOf(IllegalArgumentException::class.java)
    assertThatThrownBy { Confidence.of(1.01) }.isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `creates a resolved field`() {
    val resolved = FieldInterpretation.Resolved(candidate("Lunch"))

    assertThat(resolved.candidate.value).isEqualTo(StructuredValue.Text("Lunch"))
  }

  @Test
  fun `creates a missing field`() {
    assertThat(FieldInterpretation.Missing).isEqualTo(FieldInterpretation.Missing)
  }

  @Test
  fun `creates an ambiguous field with two or more candidates`() {
    val ambiguous = FieldInterpretation.Ambiguous(listOf(candidate("Alice"), candidate("Bob")))

    assertThat(ambiguous.candidates).hasSize(2)
  }

  @Test
  fun `rejects an ambiguous field with less than two candidates`() {
    assertThatThrownBy {
      FieldInterpretation.Ambiguous(listOf(candidate("Alice")))
    }.isInstanceOf(IllegalArgumentException::class.java)
  }

  private fun candidate(value: String): FieldCandidate = FieldCandidate(
    value = StructuredValue.Text(value),
    confidence = Confidence.of(0.7),
  )
}
