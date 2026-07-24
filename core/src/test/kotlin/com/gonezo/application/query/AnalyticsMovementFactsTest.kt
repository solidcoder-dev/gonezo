package com.gonezo.application.query

import com.gonezo.domain.shared.CurrencyCode
import com.gonezo.domain.shared.Money
import com.gonezo.recurrence.domain.RecurrenceEnd
import com.gonezo.recurrence.domain.RecurrenceFrequency
import com.gonezo.recurrence.domain.RecurrenceRule
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementReviewPolicy
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class AnalyticsMovementFactsTest {
  private val effectiveAt = Instant.parse("2026-01-01T00:00:00Z")
  private val currency = CurrencyCode.from("EUR")

  @Test
  fun `posted takes precedence over expected and scheduled projection`() {
    val identity = AnalyticsMovementIdentity.scheduled("series", 1)
    val facts = listOf(
      fact(identity, AnalyticsMovementSource.SCHEDULED_PROJECTION, "1.00"),
      fact(identity, AnalyticsMovementSource.EXPECTED, "2.00"),
      fact(identity, AnalyticsMovementSource.POSTED, "3.00"),
    )

    val selected = AnalyticsMovementDeduplicator.select(facts)

    assertThat(selected).hasSize(1)
    assertThat(selected.single().source).isEqualTo(AnalyticsMovementSource.POSTED)
    assertThat(selected.single().fullAmount.amount).isEqualByComparingTo("3.00")
  }

  @Test
  fun `different occurrences and series are retained`() {
    val facts = listOf(
      fact(AnalyticsMovementIdentity.scheduled("series-a", 1), AnalyticsMovementSource.SCHEDULED_PROJECTION),
      fact(AnalyticsMovementIdentity.scheduled("series-a", 2), AnalyticsMovementSource.SCHEDULED_PROJECTION),
      fact(AnalyticsMovementIdentity.scheduled("series-b", 1), AnalyticsMovementSource.SCHEDULED_PROJECTION),
    )

    assertThat(AnalyticsMovementDeduplicator.select(facts)).hasSize(3)
  }

  @Test
  fun `scheduled projection uses a half open window and skips consumed occurrences`() {
    val startAt = Instant.parse("2026-01-01T10:00:00Z")
    val movement = RecurringMovement.create(
      id = RecurringMovementId(UUID.fromString("00000000-0000-0000-0000-000000000001")),
      type = com.gonezo.recurrence.domain.RecurringMovementType.EXPENSE,
      sourceAccountId = "account",
      targetAccountId = null,
      amount = BigDecimal("10.00"),
      currency = "EUR",
      destinationAmount = null,
      destinationCurrency = null,
      exchangeRate = null,
      description = "Daily",
      merchant = null,
      categoryId = null,
      reviewPolicy = RecurringMovementReviewPolicy.AUTOMATIC,
      rule = RecurrenceRule(RecurrenceFrequency.DAILY),
      recurrenceEnd = RecurrenceEnd.Never,
      startAt = startAt,
      zoneId = "UTC",
      createdAt = startAt,
      scheduleCalculator = com.gonezo.recurrence.domain.services.RecurrenceScheduleCalculator(),
    ).copy(generatedOccurrences = 1)

    val occurrences = AnalyticsScheduledOccurrenceProjector().project(
      movement,
      fromInclusive = startAt,
      toExclusive = startAt.plusSeconds(2 * 24 * 60 * 60),
    )

    assertThat(occurrences.map { it.effectiveAt }).containsExactly(
      startAt.plusSeconds(24 * 60 * 60),
    )
  }

  private fun fact(
    identity: AnalyticsMovementIdentity,
    source: AnalyticsMovementSource,
    amount: String = "1.00",
  ) = AnalyticsMovementFact(
    identity = identity,
    source = source,
    effectiveAt = effectiveAt,
    accountId = "account",
    type = AnalyticsMovementType.EXPENSE,
    currency = currency,
    personalAmount = Money.of(BigDecimal(amount), "EUR"),
    fullAmount = Money.of(BigDecimal(amount), "EUR"),
    ignored = false,
    categoryId = null,
    tagIds = emptySet(),
  )
}
