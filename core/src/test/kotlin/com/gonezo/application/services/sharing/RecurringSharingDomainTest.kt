package com.gonezo.application.services.sharing

import com.gonezo.application.orchestration.DefaultExpectedOccurrenceFactory
import com.gonezo.application.orchestration.RecurringOccurrenceSnapshot
import com.gonezo.expected.domain.ExpectedMovementId
import com.gonezo.sharing.domain.*
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

class RecurringSharingDomainTest {
  @Test
  fun `parts allocation rounds participants down and leaves remainder with payer`() {
    val plan = plan(RecurringShareAllocationMode.PARTS, payerParts = 1, participantParts = listOf(1, 1))

    val amounts = PartsExpenseShareAllocationStrategy().allocate(BigDecimal("10.00"), plan, 2)

    assertThat(amounts).containsExactly(BigDecimal("3.33"), BigDecimal("3.33"))
    assertThat(amounts.reduce(BigDecimal::add)).isLessThanOrEqualTo(BigDecimal("10.00"))
  }

  @Test
  fun `amount allocation preserves fixed participant values`() {
    val plan = plan(RecurringShareAllocationMode.AMOUNTS, participantAmounts = listOf("1.25", "2.50"))

    assertThat(AmountExpenseShareAllocationStrategy().allocate(BigDecimal("10.00"), plan, 2))
      .containsExactly(BigDecimal("1.25"), BigDecimal("2.50"))
  }

  @Test
  fun `amount allocation rejects participants above occurrence total`() {
    val plan = plan(RecurringShareAllocationMode.AMOUNTS, participantAmounts = listOf("8.00", "3.00"))

    assertThatThrownBy { AmountExpenseShareAllocationStrategy().allocate(BigDecimal("10.00"), plan, 2) }
      .isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `parts allocation uses currency precision for zero decimal currencies`() {
    val plan = plan(RecurringShareAllocationMode.PARTS, payerParts = 1, participantParts = listOf(1, 1))

    val amounts = PartsExpenseShareAllocationStrategy().allocate(BigDecimal("1000"), plan, DefaultCurrencyScaleResolver.scale("JPY"))

    assertThat(amounts).containsExactly(BigDecimal("333"), BigDecimal("333"))
  }

  @Test
  fun `typed allocation rules calculate percentages with currency precision`() {
    val amounts = AllocationCalculator.allocate(
      BigDecimal("1000"),
      AllocationRule.Percentages(BigDecimal("50"), listOf(BigDecimal("25"), BigDecimal("25"))),
      DefaultCurrencyScaleResolver.scale("JPY"),
    )

    assertThat(amounts).containsExactly(BigDecimal("250"), BigDecimal("250"))
  }

  @Test
  fun `equal split uses the requested participant count`() {
    assertThat(AllocationCalculator.allocateEqualSplit(BigDecimal("10.00"), 3, 2))
      .containsExactly(BigDecimal("3.33"), BigDecimal("3.33"), BigDecimal("3.33"))
  }

  @Test
  fun `materializing a planned share preserves lifecycle and final identity`() {
    val planned = PlannedExpenseShare(
      id = PlannedExpenseShareId.random(), expectedMovementRef = ExpectedMovementRef("expected-1"),
      sourcePlanId = RecurringSharePlanId.random(), payerPersonId = SharingPersonId.random(),
      mode = RecurringShareAllocationMode.PARTS, payerParts = 1, totalAmount = BigDecimal("10.00"), currency = "EUR",
      participants = listOf(PlannedExpenseShareParticipant(PlannedExpenseShareParticipantId.random(), SharingPersonId.random(), 1, BigDecimal("5.00"), true, 0)),
      status = PlannedExpenseShareStatus.PENDING, materializedTransactionId = null, materializedShareId = null,
      createdAt = Instant.EPOCH, updatedAt = Instant.EPOCH,
    )

    val materialized = planned.materialize("transaction-1", ExpenseShareId.random(), Instant.parse("2026-07-20T10:00:00Z"))

    assertThat(materialized.status).isEqualTo(PlannedExpenseShareStatus.MATERIALIZED)
    assertThat(materialized.materializedTransactionId).isEqualTo("transaction-1")
    assertThat(materialized.materializedShareId).isNotNull()
  }

  @Test
  fun `planned share keeps payer allocation as an occurrence snapshot`() {
    val payer = SharingPersonId.random()
    val participant = SharingPersonId.random()
    val share = PlannedExpenseShare(
      id = PlannedExpenseShareId.random(),
      expectedMovementRef = ExpectedMovementRef("expected-1"),
      sourcePlanId = RecurringSharePlanId.random(),
      payerPersonId = payer,
      mode = RecurringShareAllocationMode.PARTS,
      payerParts = 2,
      totalAmount = BigDecimal("12.00"),
      currency = "EUR",
      participants = listOf(
        PlannedExpenseShareParticipant(
          id = PlannedExpenseShareParticipantId.random(),
          personId = participant,
          parts = 1,
          amount = BigDecimal("4.00"),
          reimbursable = true,
          order = 0,
        ),
      ),
      status = PlannedExpenseShareStatus.PENDING,
      materializedTransactionId = null,
      materializedShareId = null,
      createdAt = Instant.EPOCH,
      updatedAt = Instant.EPOCH,
    )

    assertThat(share.payerParts).isEqualTo(2)
    assertThat(share.totalAmount).isEqualByComparingTo("12.00")
    assertThat(share.participants.single().amount).isEqualByComparingTo("4.00")
  }

  @Test
  fun `expected occurrence factory receives independent deterministic identities`() {
    val firstFactory = DefaultExpectedOccurrenceFactory(
      expectedMovementIdGenerator = { ExpectedMovementId(UUID.fromString("00000000-0000-4000-8000-000000000001")) },
      expectedMovementItemIdGenerator = { "00000000-0000-4000-8000-000000000011" },
    )
    val secondFactory = DefaultExpectedOccurrenceFactory(
      expectedMovementIdGenerator = { ExpectedMovementId(UUID.fromString("00000000-0000-4000-8000-000000000002")) },
      expectedMovementItemIdGenerator = { "00000000-0000-4000-8000-000000000012" },
    )
    val source = RecurringOccurrenceSnapshot(
      recurringMovementId = "recurring", occurrenceId = "occurrence", accountId = "account",
      movementType = "expense", amount = BigDecimal("10.00"), currency = "EUR",
      dueAt = Instant.parse("2026-07-20T10:00:00Z"), description = null, merchant = null, categoryId = null,
      createdAt = Instant.parse("2026-07-19T10:00:00Z"),
      items = listOf(RecurringOccurrenceSnapshot.Item("template", "Dinner", BigDecimal("10.00"))),
    )

    val first = firstFactory.create(source)
    val second = secondFactory.create(source.copy(occurrenceId = "occurrence-2"))

    assertThat(first.createdAt).isEqualTo(source.createdAt)
    assertThat(first.splitItems.single().sourceTemplateItemId).isEqualTo(second.splitItems.single().sourceTemplateItemId)
    assertThat(first.splitItems.single().id).isNotEqualTo(second.splitItems.single().id)
    assertThat(first.id).isNotEqualTo(second.id)
  }

  private fun plan(
    mode: RecurringShareAllocationMode,
    payerParts: Int? = null,
    participantParts: List<Int> = emptyList(),
    participantAmounts: List<String> = emptyList(),
  ): RecurringSharePlan {
    val payer = SharingPersonId.random()
    val participants = when (mode) {
      RecurringShareAllocationMode.PARTS -> participantParts.mapIndexed { index, parts ->
        RecurringShareParticipantTemplate(RecurringShareParticipantTemplateId.random(), SharingPersonId.random(), parts, null, true, index)
      }
      RecurringShareAllocationMode.AMOUNTS -> participantAmounts.mapIndexed { index, amount ->
        RecurringShareParticipantTemplate(RecurringShareParticipantTemplateId.random(), SharingPersonId.random(), null, BigDecimal(amount), true, index)
      }
    }
    return RecurringSharePlan(
      RecurringSharePlanId.random(), RecurringMovementRef("recurring"), payer, mode, "EUR", payerParts, participants,
      Instant.EPOCH, Instant.EPOCH,
    )
  }
}
