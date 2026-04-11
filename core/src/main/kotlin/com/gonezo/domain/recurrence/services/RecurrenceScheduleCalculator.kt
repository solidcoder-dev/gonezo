package com.gonezo.recurrence.domain.services

import com.gonezo.recurrence.domain.MonthlyPattern
import com.gonezo.recurrence.domain.RecurrenceFrequency
import com.gonezo.recurrence.domain.RecurrenceRule
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.YearMonth
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.temporal.TemporalAdjusters
import kotlin.math.min

interface FrequencyCalculator {
  fun firstDueAt(anchor: ZonedDateTime, rule: RecurrenceRule): ZonedDateTime

  fun nextDueAt(anchor: ZonedDateTime, previousDueAt: ZonedDateTime, rule: RecurrenceRule): ZonedDateTime
}

class DailyFrequencyCalculator : FrequencyCalculator {
  override fun firstDueAt(anchor: ZonedDateTime, rule: RecurrenceRule): ZonedDateTime = anchor

  override fun nextDueAt(anchor: ZonedDateTime, previousDueAt: ZonedDateTime, rule: RecurrenceRule): ZonedDateTime =
    previousDueAt.plusDays(rule.interval.toLong())
}

class WeeklyFrequencyCalculator : FrequencyCalculator {
  override fun firstDueAt(anchor: ZonedDateTime, rule: RecurrenceRule): ZonedDateTime {
    val sortedDays = rule.weeklyDays.sortedBy { it.value }
    val weekStart = anchor.toLocalDate().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
    val time = anchor.toLocalTime()
    val zone = anchor.zone

    for (weekday in sortedDays) {
      val candidateDate = weekStart.plusDays((weekday.value - DayOfWeek.MONDAY.value).toLong())
      val candidate = atZonedDateTime(candidateDate, time, zone)
      if (!candidate.isBefore(anchor)) {
        return candidate
      }
    }

    val nextCycleWeekStart = weekStart.plusWeeks(rule.interval.toLong())
    val firstWeekday = sortedDays.first()
    val firstDate = nextCycleWeekStart.plusDays((firstWeekday.value - DayOfWeek.MONDAY.value).toLong())
    return atZonedDateTime(firstDate, time, zone)
  }

  override fun nextDueAt(anchor: ZonedDateTime, previousDueAt: ZonedDateTime, rule: RecurrenceRule): ZonedDateTime {
    val sortedDays = rule.weeklyDays.sortedBy { it.value }
    val weekStart = previousDueAt.toLocalDate().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
    val time = anchor.toLocalTime()
    val zone = anchor.zone
    val currentWeekdayValue = previousDueAt.dayOfWeek.value

    val nextWithinWeek = sortedDays.firstOrNull { it.value > currentWeekdayValue }
    if (nextWithinWeek != null) {
      val nextDate = weekStart.plusDays((nextWithinWeek.value - DayOfWeek.MONDAY.value).toLong())
      return atZonedDateTime(nextDate, time, zone)
    }

    val nextCycleWeekStart = weekStart.plusWeeks(rule.interval.toLong())
    val firstWeekday = sortedDays.first()
    val firstDate = nextCycleWeekStart.plusDays((firstWeekday.value - DayOfWeek.MONDAY.value).toLong())
    return atZonedDateTime(firstDate, time, zone)
  }
}

class MonthlyFrequencyCalculator : FrequencyCalculator {
  override fun firstDueAt(anchor: ZonedDateTime, rule: RecurrenceRule): ZonedDateTime {
    var month = YearMonth.from(anchor)
    val time = anchor.toLocalTime()
    val zone = anchor.zone
    while (true) {
      val candidate = resolveMonthlyCandidate(anchor, month, time, zone, rule)
      if (!candidate.isBefore(anchor)) {
        return candidate
      }
      month = month.plusMonths(rule.interval.toLong())
    }
  }

  override fun nextDueAt(anchor: ZonedDateTime, previousDueAt: ZonedDateTime, rule: RecurrenceRule): ZonedDateTime {
    val month = YearMonth.from(previousDueAt).plusMonths(rule.interval.toLong())
    val time = anchor.toLocalTime()
    val zone = anchor.zone
    return resolveMonthlyCandidate(anchor, month, time, zone, rule)
  }

  private fun resolveMonthlyCandidate(
    anchor: ZonedDateTime,
    month: YearMonth,
    time: LocalTime,
    zone: ZoneId,
    rule: RecurrenceRule,
  ): ZonedDateTime {
    val localDate = when (rule.monthlyPattern) {
      MonthlyPattern.DAY_OF_MONTH -> {
        val day = rule.dayOfMonth ?: anchor.dayOfMonth
        LocalDate.of(
          month.year,
          month.month,
          min(day, month.lengthOfMonth()),
        )
      }

      MonthlyPattern.NTH_WEEKDAY -> nthWeekdayInMonth(
        month = month,
        ordinal = requireNotNull(rule.monthlyWeekOrdinal),
        weekday = requireNotNull(rule.monthlyWeekday),
      )
    }
    return atZonedDateTime(localDate, time, zone)
  }

  private fun nthWeekdayInMonth(month: YearMonth, ordinal: Int, weekday: DayOfWeek): LocalDate {
    val firstOfMonth = month.atDay(1)
    val firstWeekday = firstOfMonth.with(TemporalAdjusters.nextOrSame(weekday))
    val candidate = firstWeekday.plusWeeks((ordinal - 1).toLong())
    return if (candidate.monthValue == month.monthValue) {
      candidate
    } else {
      candidate.minusWeeks(1)
    }
  }
}

class YearlyFrequencyCalculator : FrequencyCalculator {
  override fun firstDueAt(anchor: ZonedDateTime, rule: RecurrenceRule): ZonedDateTime = anchor

  override fun nextDueAt(anchor: ZonedDateTime, previousDueAt: ZonedDateTime, rule: RecurrenceRule): ZonedDateTime {
    val nextYear = previousDueAt.year + rule.interval
    val localDate = resolveAnchorDateForYear(anchor, nextYear)
    return atZonedDateTime(localDate, anchor.toLocalTime(), anchor.zone)
  }

  private fun resolveAnchorDateForYear(anchor: ZonedDateTime, year: Int): LocalDate {
    val month = anchor.month
    val day = anchor.dayOfMonth
    val targetMonth = YearMonth.of(year, month)
    return LocalDate.of(year, month, min(day, targetMonth.lengthOfMonth()))
  }
}

class RecurrenceScheduleCalculator(
  private val dailyCalculator: FrequencyCalculator = DailyFrequencyCalculator(),
  private val weeklyCalculator: FrequencyCalculator = WeeklyFrequencyCalculator(),
  private val monthlyCalculator: FrequencyCalculator = MonthlyFrequencyCalculator(),
  private val yearlyCalculator: FrequencyCalculator = YearlyFrequencyCalculator(),
) {
  fun firstDueAt(startAt: Instant, zoneId: String, rule: RecurrenceRule): Instant {
    val anchor = ZonedDateTime.ofInstant(startAt, ZoneId.of(zoneId))
    return calculatorFor(rule.frequency).firstDueAt(anchor, rule).toInstant()
  }

  fun nextDueAt(startAt: Instant, zoneId: String, previousDueAt: Instant, rule: RecurrenceRule): Instant {
    val zone = ZoneId.of(zoneId)
    val anchor = ZonedDateTime.ofInstant(startAt, zone)
    val previous = ZonedDateTime.ofInstant(previousDueAt, zone)
    return calculatorFor(rule.frequency).nextDueAt(anchor, previous, rule).toInstant()
  }

  private fun calculatorFor(frequency: RecurrenceFrequency): FrequencyCalculator =
    when (frequency) {
      RecurrenceFrequency.DAILY -> dailyCalculator
      RecurrenceFrequency.WEEKLY -> weeklyCalculator
      RecurrenceFrequency.MONTHLY -> monthlyCalculator
      RecurrenceFrequency.YEARLY -> yearlyCalculator
    }
}

private fun atZonedDateTime(date: LocalDate, time: LocalTime, zone: ZoneId): ZonedDateTime =
  LocalDateTime.of(date, time).atZone(zone)
