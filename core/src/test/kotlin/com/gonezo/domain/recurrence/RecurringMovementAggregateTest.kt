package com.gonezo.domain.recurrence

import com.gonezo.recurrence.domain.MonthlyPattern
import com.gonezo.recurrence.domain.RecurrenceEnd
import com.gonezo.recurrence.domain.RecurrenceFrequency
import com.gonezo.recurrence.domain.RecurrenceRule
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementStatus
import com.gonezo.recurrence.domain.RecurringMovementType
import com.gonezo.recurrence.domain.services.RecurrenceScheduleCalculator
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate

class RecurringMovementAggregateTest {
  private val calculator = RecurrenceScheduleCalculator()

  @Test
  fun `creates recurring expense and computes first due date from monthly rule`() {
    val movement = recurringMovement(
      rule = RecurrenceRule(
        frequency = RecurrenceFrequency.MONTHLY,
        monthlyPattern = MonthlyPattern.DAY_OF_MONTH,
        dayOfMonth = 11,
      ),
      startAt = Instant.parse("2026-02-04T10:00:00Z"),
    )

    assertThat(movement.status).isEqualTo(RecurringMovementStatus.ACTIVE)
    assertThat(movement.nextDueAt).isEqualTo(Instant.parse("2026-02-11T10:00:00Z"))
  }

  @Test
  fun `deactivate keeps historical occurrences counter and removes next due`() {
    val original = recurringMovement(
      generatedOccurrences = 4,
    )

    val deactivated = original.deactivate(Instant.parse("2026-04-11T11:00:00Z"))

    assertThat(deactivated.status).isEqualTo(RecurringMovementStatus.DEACTIVATED)
    assertThat(deactivated.generatedOccurrences).isEqualTo(4)
    assertThat(deactivated.nextDueAt).isNull()
    assertThat(deactivated.deactivatedAt).isEqualTo(Instant.parse("2026-04-11T11:00:00Z"))
  }

  @Test
  fun `advance increases generated occurrences and recalculates next due`() {
    val movement = recurringMovement(
      rule = RecurrenceRule(
        frequency = RecurrenceFrequency.DAILY,
        interval = 1,
      ),
      startAt = Instant.parse("2026-04-10T09:00:00Z"),
    )

    val advanced = movement.advanceAfterDue(
      dueAt = Instant.parse("2026-04-10T09:00:00Z"),
      advancedAt = Instant.parse("2026-04-10T09:01:00Z"),
      scheduleCalculator = calculator,
    )

    assertThat(advanced.generatedOccurrences).isEqualTo(1)
    assertThat(advanced.nextDueAt).isEqualTo(Instant.parse("2026-04-11T09:00:00Z"))
    assertThat(advanced.status).isEqualTo(RecurringMovementStatus.ACTIVE)
  }

  @Test
  fun `end after occurrences completes exactly on configured count`() {
    val movement = recurringMovement(
      recurrenceEnd = RecurrenceEnd.AfterOccurrences(2),
      rule = RecurrenceRule(
        frequency = RecurrenceFrequency.DAILY,
        interval = 1,
      ),
      startAt = Instant.parse("2026-04-10T09:00:00Z"),
    )

    val firstAdvance = movement.advanceAfterDue(
      dueAt = Instant.parse("2026-04-10T09:00:00Z"),
      advancedAt = Instant.parse("2026-04-10T09:01:00Z"),
      scheduleCalculator = calculator,
    )
    val secondAdvance = firstAdvance.advanceAfterDue(
      dueAt = Instant.parse("2026-04-11T09:00:00Z"),
      advancedAt = Instant.parse("2026-04-11T09:01:00Z"),
      scheduleCalculator = calculator,
    )

    assertThat(secondAdvance.status).isEqualTo(RecurringMovementStatus.COMPLETED)
    assertThat(secondAdvance.generatedOccurrences).isEqualTo(2)
    assertThat(secondAdvance.nextDueAt).isNull()
  }

  @Test
  fun `end on date completes when next due would exceed end date`() {
    val movement = recurringMovement(
      recurrenceEnd = RecurrenceEnd.OnDate(LocalDate.parse("2026-04-11")),
      rule = RecurrenceRule(
        frequency = RecurrenceFrequency.DAILY,
        interval = 1,
      ),
      startAt = Instant.parse("2026-04-10T09:00:00Z"),
    )

    val firstAdvance = movement.advanceAfterDue(
      dueAt = Instant.parse("2026-04-10T09:00:00Z"),
      advancedAt = Instant.parse("2026-04-10T09:01:00Z"),
      scheduleCalculator = calculator,
    )
    val secondAdvance = firstAdvance.advanceAfterDue(
      dueAt = Instant.parse("2026-04-11T09:00:00Z"),
      advancedAt = Instant.parse("2026-04-11T09:01:00Z"),
      scheduleCalculator = calculator,
    )

    assertThat(secondAdvance.status).isEqualTo(RecurringMovementStatus.COMPLETED)
    assertThat(secondAdvance.nextDueAt).isNull()
    assertThat(secondAdvance.completedAt).isEqualTo(Instant.parse("2026-04-11T09:01:00Z"))
  }

  @Test
  fun `creation completes immediately when first due is after end date`() {
    val movement = recurringMovement(
      recurrenceEnd = RecurrenceEnd.OnDate(LocalDate.parse("2026-02-05")),
      rule = RecurrenceRule(
        frequency = RecurrenceFrequency.MONTHLY,
        monthlyPattern = MonthlyPattern.DAY_OF_MONTH,
        dayOfMonth = 11,
      ),
      startAt = Instant.parse("2026-02-06T10:00:00Z"),
    )

    assertThat(movement.status).isEqualTo(RecurringMovementStatus.COMPLETED)
    assertThat(movement.nextDueAt).isNull()
    assertThat(movement.completedAt).isEqualTo(Instant.parse("2026-04-11T10:00:00Z"))
  }

  @Test
  fun `transfer recurring movement requires target account`() {
    assertThatThrownBy {
      RecurringMovement.create(
        id = RecurringMovementId.random(),
        type = RecurringMovementType.TRANSFER,
        sourceAccountId = "acc-source",
        targetAccountId = null,
        amount = BigDecimal("10.00"),
        currency = "USD",
        destinationAmount = null,
        destinationCurrency = null,
        exchangeRate = null,
        description = null,
        merchant = null,
        rule = RecurrenceRule(
          frequency = RecurrenceFrequency.DAILY,
        ),
        recurrenceEnd = RecurrenceEnd.Never,
        startAt = Instant.parse("2026-04-11T10:00:00Z"),
        zoneId = "UTC",
        createdAt = Instant.parse("2026-04-11T10:00:00Z"),
        scheduleCalculator = calculator,
      )
    }
      .isInstanceOf(IllegalArgumentException::class.java)
      .hasMessageContaining("targetAccountId is required")
  }

  @Test
  fun `advance fails when due instant does not match aggregate next due`() {
    val movement = recurringMovement(
      rule = RecurrenceRule(
        frequency = RecurrenceFrequency.DAILY,
      ),
      startAt = Instant.parse("2026-04-10T09:00:00Z"),
    )

    assertThatThrownBy {
      movement.advanceAfterDue(
        dueAt = Instant.parse("2026-04-12T09:00:00Z"),
        advancedAt = Instant.parse("2026-04-12T09:00:01Z"),
        scheduleCalculator = calculator,
      )
    }
      .isInstanceOf(IllegalStateException::class.java)
      .hasMessageContaining("dueAt mismatch")
  }

  private fun recurringMovement(
    rule: RecurrenceRule = RecurrenceRule(
      frequency = RecurrenceFrequency.DAILY,
      interval = 1,
    ),
    recurrenceEnd: RecurrenceEnd = RecurrenceEnd.Never,
    startAt: Instant = Instant.parse("2026-04-10T09:00:00Z"),
    createdAt: Instant = Instant.parse("2026-04-11T10:00:00Z"),
    generatedOccurrences: Int = 0,
  ): RecurringMovement {
    val created = RecurringMovement.create(
      id = RecurringMovementId.random(),
      type = RecurringMovementType.EXPENSE,
      sourceAccountId = "acc-wallet",
      targetAccountId = null,
      amount = BigDecimal("25.00"),
      currency = "usd",
      destinationAmount = null,
      destinationCurrency = null,
      exchangeRate = null,
      description = "Gym",
      merchant = "Gym",
      rule = rule,
      recurrenceEnd = recurrenceEnd,
      startAt = startAt,
      zoneId = "UTC",
      createdAt = createdAt,
      scheduleCalculator = calculator,
    )
    return created.copy(generatedOccurrences = generatedOccurrences)
  }
}
