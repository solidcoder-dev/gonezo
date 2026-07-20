package com.gonezo.application.orchestration

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class ExpectedOccurrenceFactoryTest {
  @Test
  fun `projects every occurrence with fresh item ids and source template ids`() {
    val factory = DefaultExpectedOccurrenceFactory()
    val source = snapshot()

    val first = factory.create(source.copy(occurrenceId = "occurrence-1"))
    val second = factory.create(source.copy(occurrenceId = "occurrence-2"))

    assertThat(first.id).isNotEqualTo(second.id)
    assertThat(first.splitItems.map { it.id })
      .doesNotContainAnyElementsOf(second.splitItems.map { it.id })
    assertThat(first.splitItems.map { it.sourceTemplateItemId })
      .containsExactly("template-a", "template-b")
    assertThat(second.splitItems.map { it.sourceTemplateItemId })
      .containsExactly("template-a", "template-b")
    assertThat(second.splitItems.map { it.name }).containsExactly("Rent", "Utilities")
    assertThat(second.splitItems.map { it.amount })
      .containsExactly(BigDecimal("80.00"), BigDecimal("40.00"))
  }

  private fun snapshot(): RecurringOccurrenceSnapshot = RecurringOccurrenceSnapshot(
    recurringMovementId = "recurring-1",
    occurrenceId = "occurrence-0",
    accountId = "account-1",
    movementType = "expense",
    amount = BigDecimal("120.00"),
    currency = "USD",
    dueAt = Instant.parse("2026-07-01T09:00:00Z"),
    description = "Household",
    merchant = "Landlord",
    categoryId = "rent",
    createdAt = Instant.parse("2026-07-01T09:00:00Z"),
    items = listOf(
      RecurringOccurrenceSnapshot.Item("template-a", "Rent", BigDecimal("80.00")),
      RecurringOccurrenceSnapshot.Item("template-b", "Utilities", BigDecimal("40.00")),
    ),
  )
}
