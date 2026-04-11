package com.gonezo.domain.recurrence

import com.gonezo.recurrence.domain.MonthlyPattern
import com.gonezo.recurrence.domain.RecurrenceFrequency
import com.gonezo.recurrence.domain.RecurrenceRule
import com.gonezo.recurrence.domain.services.RecurrenceScheduleCalculator
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.DayOfWeek
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime

class RecurrenceScheduleCalculatorTest {
  private val calculator = RecurrenceScheduleCalculator()

  @Test
  fun `daily recurrence advances by interval days`() {
    val rule = RecurrenceRule(
      frequency = RecurrenceFrequency.DAILY,
      interval = 2,
    )
    val startAt = Instant.parse("2026-04-11T10:15:00Z")

    val first = calculator.firstDueAt(startAt, "UTC", rule)
    val second = calculator.nextDueAt(startAt, "UTC", first, rule)

    assertThat(first).isEqualTo(startAt)
    assertThat(second).isEqualTo(Instant.parse("2026-04-13T10:15:00Z"))
  }

  @Test
  fun `weekly recurrence resolves first selected day on or after start`() {
    val rule = RecurrenceRule(
      frequency = RecurrenceFrequency.WEEKLY,
      weeklyDays = setOf(DayOfWeek.THURSDAY),
    )
    val startAt = Instant.parse("2026-02-03T08:30:00Z")

    val first = calculator.firstDueAt(startAt, "UTC", rule)

    assertThat(first).isEqualTo(Instant.parse("2026-02-05T08:30:00Z"))
  }

  @Test
  fun `weekly recurrence with multi-day and interval keeps cadence`() {
    val rule = RecurrenceRule(
      frequency = RecurrenceFrequency.WEEKLY,
      interval = 2,
      weeklyDays = setOf(DayOfWeek.MONDAY, DayOfWeek.THURSDAY),
    )
    val startAt = Instant.parse("2026-02-03T08:30:00Z")

    val first = calculator.firstDueAt(startAt, "UTC", rule)
    val second = calculator.nextDueAt(startAt, "UTC", first, rule)
    val third = calculator.nextDueAt(startAt, "UTC", second, rule)

    assertThat(first).isEqualTo(Instant.parse("2026-02-05T08:30:00Z"))
    assertThat(second).isEqualTo(Instant.parse("2026-02-16T08:30:00Z"))
    assertThat(third).isEqualTo(Instant.parse("2026-02-19T08:30:00Z"))
  }

  @Test
  fun `monthly recurrence on day of month clamps short months and restores long months`() {
    val rule = RecurrenceRule(
      frequency = RecurrenceFrequency.MONTHLY,
      interval = 1,
      monthlyPattern = MonthlyPattern.DAY_OF_MONTH,
      dayOfMonth = 31,
    )
    val startAt = Instant.parse("2026-03-31T10:00:00Z")

    val first = calculator.firstDueAt(startAt, "UTC", rule)
    val second = calculator.nextDueAt(startAt, "UTC", first, rule)
    val third = calculator.nextDueAt(startAt, "UTC", second, rule)

    assertThat(first).isEqualTo(Instant.parse("2026-03-31T10:00:00Z"))
    assertThat(second).isEqualTo(Instant.parse("2026-04-30T10:00:00Z"))
    assertThat(third).isEqualTo(Instant.parse("2026-05-31T10:00:00Z"))
  }

  @Test
  fun `monthly recurrence day of month schedules first date after start when needed`() {
    val rule = RecurrenceRule(
      frequency = RecurrenceFrequency.MONTHLY,
      monthlyPattern = MonthlyPattern.DAY_OF_MONTH,
      dayOfMonth = 11,
    )
    val startAt = Instant.parse("2026-02-04T12:00:00Z")

    val first = calculator.firstDueAt(startAt, "UTC", rule)

    assertThat(first).isEqualTo(Instant.parse("2026-02-11T12:00:00Z"))
  }

  @Test
  fun `monthly recurrence supports nth weekday rule`() {
    val rule = RecurrenceRule(
      frequency = RecurrenceFrequency.MONTHLY,
      monthlyPattern = MonthlyPattern.NTH_WEEKDAY,
      monthlyWeekOrdinal = 3,
      monthlyWeekday = DayOfWeek.THURSDAY,
    )
    val startAt = Instant.parse("2026-02-01T08:00:00Z")

    val first = calculator.firstDueAt(startAt, "UTC", rule)
    val second = calculator.nextDueAt(startAt, "UTC", first, rule)

    assertThat(first).isEqualTo(Instant.parse("2026-02-19T08:00:00Z"))
    assertThat(second).isEqualTo(Instant.parse("2026-03-19T08:00:00Z"))
  }

  @Test
  fun `monthly nth weekday fallback uses last weekday when ordinal exceeds month length`() {
    val rule = RecurrenceRule(
      frequency = RecurrenceFrequency.MONTHLY,
      monthlyPattern = MonthlyPattern.NTH_WEEKDAY,
      monthlyWeekOrdinal = 5,
      monthlyWeekday = DayOfWeek.MONDAY,
    )
    val startAt = Instant.parse("2026-04-01T09:00:00Z")

    val first = calculator.firstDueAt(startAt, "UTC", rule)

    assertThat(first).isEqualTo(Instant.parse("2026-04-27T09:00:00Z"))
  }

  @Test
  fun `yearly recurrence keeps feb 29 anchor when leap year returns`() {
    val rule = RecurrenceRule(
      frequency = RecurrenceFrequency.YEARLY,
      interval = 1,
    )
    val startAt = Instant.parse("2024-02-29T10:00:00Z")

    val first = calculator.firstDueAt(startAt, "UTC", rule)
    val second = calculator.nextDueAt(startAt, "UTC", first, rule)
    val third = calculator.nextDueAt(startAt, "UTC", second, rule)
    val fourth = calculator.nextDueAt(startAt, "UTC", third, rule)
    val fifth = calculator.nextDueAt(startAt, "UTC", fourth, rule)

    assertThat(first).isEqualTo(Instant.parse("2024-02-29T10:00:00Z"))
    assertThat(second).isEqualTo(Instant.parse("2025-02-28T10:00:00Z"))
    assertThat(third).isEqualTo(Instant.parse("2026-02-28T10:00:00Z"))
    assertThat(fourth).isEqualTo(Instant.parse("2027-02-28T10:00:00Z"))
    assertThat(fifth).isEqualTo(Instant.parse("2028-02-29T10:00:00Z"))
  }

  @Test
  fun `calculator handles dst jump without throwing`() {
    val rule = RecurrenceRule(
      frequency = RecurrenceFrequency.DAILY,
      interval = 1,
    )
    val zone = ZoneId.of("Europe/Madrid")
    val start = ZonedDateTime.of(2026, 3, 28, 2, 30, 0, 0, zone).toInstant()

    val first = calculator.firstDueAt(start, zone.id, rule)
    val second = calculator.nextDueAt(start, zone.id, first, rule)

    val secondInZone = ZonedDateTime.ofInstant(second, zone)
    assertThat(secondInZone.toLocalDate().toString()).isEqualTo("2026-03-29")
    assertThat(secondInZone.hour).isIn(2, 3)
  }
}
