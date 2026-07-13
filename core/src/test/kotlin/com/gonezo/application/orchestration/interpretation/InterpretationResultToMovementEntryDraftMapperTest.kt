package com.gonezo.application.orchestration.interpretation

import dev.solidcoder.interpretation.domain.Confidence
import dev.solidcoder.interpretation.domain.FieldCandidate
import dev.solidcoder.interpretation.domain.FieldInterpretation
import dev.solidcoder.interpretation.domain.FieldKey
import dev.solidcoder.interpretation.domain.FieldResult
import dev.solidcoder.interpretation.domain.InterpretationResult
import dev.solidcoder.interpretation.domain.InterpretationSpecId
import dev.solidcoder.interpretation.domain.InterpretationSpecVersion
import dev.solidcoder.interpretation.domain.StructuredValue
import java.math.BigDecimal
import java.time.LocalDate
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class InterpretationResultToMovementEntryDraftMapperTest {
  private val mapper = InterpretationResultToMovementEntryDraftMapper()

  @Test
  fun `maps expense values and keeps no issues when all fields are resolved with enough confidence`() {
    val result = result(
      type = resolvedEnum("expense"),
      amount = resolvedDecimal("20.00"),
      occurredOn = resolvedDate("2026-07-13"),
      note = resolvedText("Food"),
      categoryId = resolvedEnum("cat-food"),
    )

    assertThat(mapper.map(result)).isEqualTo(
      MovementEntryDraft(
        type = MovementEntryDraftType.EXPENSE,
        amount = BigDecimal("20.00"),
        occurredOn = LocalDate.parse("2026-07-13"),
        note = "Food",
        categoryId = "cat-food",
        issues = emptyList(),
      ),
    )
  }

  @Test
  fun `maps income values`() {
    val result = result(
      type = resolvedEnum("income"),
      amount = resolvedDecimal("1200.00"),
      occurredOn = resolvedDate("2026-07-14"),
      note = resolvedText("Salary"),
    )

    assertThat(mapper.map(result).type).isEqualTo(MovementEntryDraftType.INCOME)
  }

  @Test
  fun `rejects unsupported type values`() {
    val result = result(
      type = resolvedEnum("transfer"),
      amount = resolvedDecimal("20.00"),
      occurredOn = resolvedDate("2026-07-13"),
      note = resolvedText("Food"),
    )

    assertThatThrownBy { mapper.map(result) }
      .isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `rejects invalid or negative amounts`() {
    val result = result(
      type = resolvedEnum("expense"),
      amount = resolvedDecimal("-20.00"),
      occurredOn = resolvedDate("2026-07-13"),
      note = resolvedText("Food"),
    )

    assertThatThrownBy { mapper.map(result) }
      .isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `rejects invalid dates and keeps valid dates`() {
    val valid = mapper.map(
      result(
        type = resolvedEnum("expense"),
        amount = resolvedDecimal("20.00"),
        occurredOn = resolvedDate("2026-07-13"),
        note = resolvedText("Food"),
      ),
    )

    assertThat(valid.occurredOn).isEqualTo(LocalDate.parse("2026-07-13"))

    val invalidDateResult = InterpretationResult.fromDecoded(
      specId = InterpretationSpecId.of("movement-entry"),
      specVersion = InterpretationSpecVersion.of("v1"),
      fields = listOf(
        FieldResult(FieldKey.of("type"), FieldInterpretation.Resolved(resolvedCandidate(StructuredValue.Enum("expense")))),
        FieldResult(FieldKey.of("amount"), FieldInterpretation.Resolved(resolvedCandidate(StructuredValue.Decimal(BigDecimal("20.00"))))),
        FieldResult(FieldKey.of("occurredOn"), FieldInterpretation.Resolved(resolvedCandidate(StructuredValue.Text("2026-07-13")))),
        FieldResult(FieldKey.of("note"), FieldInterpretation.Resolved(resolvedCandidate(StructuredValue.Text("Food")))),
      ),
    )

    assertThatThrownBy { mapper.map(invalidDateResult) }
      .isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `omits missing note`() {
    val result = InterpretationResult.fromDecoded(
      specId = InterpretationSpecId.of("movement-entry"),
      specVersion = InterpretationSpecVersion.of("v1"),
      fields = listOf(
        FieldResult(FieldKey.of("type"), FieldInterpretation.Resolved(resolvedEnum("expense"))),
        FieldResult(FieldKey.of("amount"), FieldInterpretation.Resolved(resolvedDecimal("20.00"))),
        FieldResult(FieldKey.of("occurredOn"), FieldInterpretation.Resolved(resolvedDate("2026-07-13"))),
        FieldResult(FieldKey.of("note"), FieldInterpretation.Missing),
      ),
    )

    assertThat(mapper.map(result).note).isNull()
  }

  @Test
  fun `keeps category when available and omits it when schema has no categories`() {
    val resultWithCategory = result(
      type = resolvedEnum("expense"),
      amount = resolvedDecimal("20.00"),
      occurredOn = resolvedDate("2026-07-13"),
      note = resolvedText("Food"),
      categoryId = resolvedEnum("cat-food"),
    )
    val resultWithoutCategory = InterpretationResult.fromDecoded(
      specId = InterpretationSpecId.of("movement-entry"),
      specVersion = InterpretationSpecVersion.of("v1"),
      fields = listOf(
        FieldResult(FieldKey.of("type"), FieldInterpretation.Resolved(resolvedCandidate(StructuredValue.Enum("expense")))),
        FieldResult(FieldKey.of("amount"), FieldInterpretation.Resolved(resolvedCandidate(StructuredValue.Decimal(BigDecimal("20.00"))))),
        FieldResult(FieldKey.of("occurredOn"), FieldInterpretation.Resolved(resolvedCandidate(StructuredValue.Date(LocalDate.parse("2026-07-13"))))),
        FieldResult(FieldKey.of("note"), FieldInterpretation.Resolved(resolvedCandidate(StructuredValue.Text("Food")))),
      ),
    )

    assertThat(mapper.map(resultWithCategory).categoryId).isEqualTo("cat-food")
    assertThat(mapper.map(resultWithoutCategory).categoryId).isNull()
  }

  @Test
  fun `records missing ambiguous and low confidence fields as typed issues`() {
    val result = InterpretationResult.fromDecoded(
      specId = InterpretationSpecId.of("movement-entry"),
      specVersion = InterpretationSpecVersion.of("v1"),
      fields = listOf(
        FieldResult(FieldKey.of("type"), FieldInterpretation.Missing),
        FieldResult(FieldKey.of("amount"), FieldInterpretation.Ambiguous(listOf(resolvedDecimal("19.00"), resolvedDecimal("20.00")))),
        FieldResult(FieldKey.of("occurredOn"), FieldInterpretation.Resolved(resolvedDate("2026-07-13"))),
        FieldResult(FieldKey.of("note"), FieldInterpretation.Resolved(resolvedText("Food", confidence = 0.4))),
      ),
    )

    assertThat(mapper.map(result).issues).contains(
      MovementEntryDraftIssue(MovementEntryDraftField.TYPE, MovementEntryDraftIssueCode.FIELD_MISSING),
      MovementEntryDraftIssue(MovementEntryDraftField.AMOUNT, MovementEntryDraftIssueCode.FIELD_AMBIGUOUS),
      MovementEntryDraftIssue(MovementEntryDraftField.NOTE, MovementEntryDraftIssueCode.CONFIDENCE_INSUFFICIENT),
    )
  }

  @Test
  fun `rejects schema identifiers outside the movement entry contract`() {
    val invalidSpecIdResult = InterpretationResult.fromDecoded(
      specId = InterpretationSpecId.of("other"),
      specVersion = InterpretationSpecVersion.of("v1"),
      fields = validFields(),
    )

    assertThatThrownBy { mapper.map(invalidSpecIdResult) }
      .isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `rejects schema versions outside the movement entry contract`() {
    val invalidSpecVersionResult = InterpretationResult.fromDecoded(
      specId = InterpretationSpecId.of("movement-entry"),
      specVersion = InterpretationSpecVersion.of("2"),
      fields = validFields(),
    )

    assertThatThrownBy { mapper.map(invalidSpecVersionResult) }
      .isInstanceOf(IllegalArgumentException::class.java)
  }

  private fun result(
    type: FieldInterpretation,
    amount: FieldInterpretation,
    occurredOn: FieldInterpretation,
    note: FieldInterpretation,
    categoryId: FieldInterpretation? = null,
  ): InterpretationResult = InterpretationResult.fromDecoded(
    specId = InterpretationSpecId.of("movement-entry"),
    specVersion = InterpretationSpecVersion.of("v1"),
    fields = buildList {
      add(FieldResult(FieldKey.of("type"), type))
      add(FieldResult(FieldKey.of("amount"), amount))
      add(FieldResult(FieldKey.of("occurredOn"), occurredOn))
      add(FieldResult(FieldKey.of("note"), note))
      if (categoryId != null) {
        add(FieldResult(FieldKey.of("categoryId"), categoryId))
      }
    },
  )

  private fun result(
    type: FieldCandidate,
    amount: FieldCandidate,
    occurredOn: FieldCandidate,
    note: FieldCandidate,
    categoryId: FieldCandidate? = null,
  ): InterpretationResult = InterpretationResult.fromDecoded(
    specId = InterpretationSpecId.of("movement-entry"),
    specVersion = InterpretationSpecVersion.of("v1"),
    fields = buildList {
      add(FieldResult(FieldKey.of("type"), FieldInterpretation.Resolved(type)))
      add(FieldResult(FieldKey.of("amount"), FieldInterpretation.Resolved(amount)))
      add(FieldResult(FieldKey.of("occurredOn"), FieldInterpretation.Resolved(occurredOn)))
      add(FieldResult(FieldKey.of("note"), FieldInterpretation.Resolved(note)))
      if (categoryId != null) {
        add(FieldResult(FieldKey.of("categoryId"), FieldInterpretation.Resolved(categoryId)))
      } else {
        add(FieldResult(FieldKey.of("categoryId"), FieldInterpretation.Missing))
      }
    },
  )

  private fun resolvedEnum(stableValue: String, confidence: Double = 0.9) = resolvedCandidate(StructuredValue.Enum(stableValue), confidence)

  private fun resolvedDecimal(value: String, confidence: Double = 0.9) = resolvedCandidate(StructuredValue.Decimal(BigDecimal(value)), confidence)

  private fun resolvedDate(value: String, confidence: Double = 0.9) = resolvedCandidate(StructuredValue.Date(LocalDate.parse(value)), confidence)

  private fun resolvedText(value: String, confidence: Double = 0.9) = resolvedCandidate(StructuredValue.Text(value), confidence)

  private fun resolvedCandidate(value: StructuredValue, confidence: Double = 0.9) = FieldCandidate(
    value = value,
    confidence = Confidence.of(confidence),
  )

  private fun validFields(): List<FieldResult> = listOf(
    FieldResult(FieldKey.of("type"), FieldInterpretation.Resolved(resolvedEnum("expense"))),
    FieldResult(FieldKey.of("amount"), FieldInterpretation.Resolved(resolvedDecimal("20.00"))),
    FieldResult(FieldKey.of("occurredOn"), FieldInterpretation.Resolved(resolvedDate("2026-07-13"))),
    FieldResult(FieldKey.of("note"), FieldInterpretation.Resolved(resolvedText("Food"))),
    FieldResult(FieldKey.of("categoryId"), FieldInterpretation.Missing),
  )
}
