package com.gonezo.application.query

import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

enum class AnalyticsPeriodKind {
  THIS_MONTH,
  LAST_MONTH,
  CUSTOM,
  THIS_YEAR,
  ALL_TIME,
}

data class AnalyticsPeriodSelection(
  val kind: AnalyticsPeriodKind,
  val from: LocalDate? = null,
  val to: LocalDate? = null,
)

data class AnalyticsInstantRange(val fromInclusive: Instant, val toExclusive: Instant) {
  init {
    require(fromInclusive < toExclusive) { "analytics range must be non-empty" }
  }

  fun contains(value: Instant): Boolean = !value.isBefore(fromInclusive) && value.isBefore(toExclusive)
}

data class AnalyticsResolvedWindows(
  val current: AnalyticsInstantRange?,
  val comparison: AnalyticsInstantRange?,
)

class AnalyticsWindowResolver(
  private val clock: Clock,
  private val zoneId: ZoneId,
) {
  fun resolve(period: AnalyticsPeriodSelection, includePlannedMovements: Boolean): AnalyticsResolvedWindows {
    val today = LocalDate.now(clock.withZone(zoneId))
    val currentDates = currentDates(period, today, includePlannedMovements)
    val comparisonDates = comparisonDates(period, currentDates, includePlannedMovements)
    return AnalyticsResolvedWindows(
      current = currentDates?.let(::toInstantRange),
      comparison = comparisonDates?.let(::toInstantRange),
    )
  }

  private fun currentDates(
    period: AnalyticsPeriodSelection,
    today: LocalDate,
    includePlannedMovements: Boolean,
  ): ClosedDateRange? = when (period.kind) {
    AnalyticsPeriodKind.THIS_MONTH -> {
      val start = today.withDayOfMonth(1)
      ClosedDateRange(start, if (includePlannedMovements) start.plusMonths(1).minusDays(1) else today)
    }
    AnalyticsPeriodKind.LAST_MONTH -> {
      val start = today.withDayOfMonth(1).minusMonths(1)
      ClosedDateRange(start, start.plusMonths(1).minusDays(1))
    }
    AnalyticsPeriodKind.THIS_YEAR -> {
      val start = today.withDayOfYear(1)
      ClosedDateRange(start, if (includePlannedMovements) start.plusYears(1).minusDays(1) else today)
    }
    AnalyticsPeriodKind.CUSTOM -> {
      val from = requireNotNull(period.from) { "custom analytics period requires from" }
      val to = requireNotNull(period.to) { "custom analytics period requires to" }
      ClosedDateRange(from, to).also { require(from <= to) { "analytics custom period requires from <= to" } }
    }
    AnalyticsPeriodKind.ALL_TIME -> null
  }

  private fun comparisonDates(
    period: AnalyticsPeriodSelection,
    current: ClosedDateRange?,
    includePlannedMovements: Boolean,
  ): ClosedDateRange? {
    if (current == null) return null
    return when (period.kind) {
      AnalyticsPeriodKind.THIS_MONTH -> {
        val start = current.from.minusMonths(1).withDayOfMonth(1)
        if (includePlannedMovements) ClosedDateRange(start, start.plusMonths(1).minusDays(1))
        else ClosedDateRange(start, start.plusDays(current.days - 1))
      }
      AnalyticsPeriodKind.LAST_MONTH -> {
        val start = current.from.minusMonths(1).withDayOfMonth(1)
        ClosedDateRange(start, start.plusMonths(1).minusDays(1))
      }
      AnalyticsPeriodKind.THIS_YEAR -> {
        val start = current.from.minusYears(1).withDayOfYear(1)
        if (includePlannedMovements) ClosedDateRange(start, start.plusYears(1).minusDays(1))
        else ClosedDateRange(start, start.plusDays(current.days - 1))
      }
      AnalyticsPeriodKind.CUSTOM -> {
        val days = current.days
        ClosedDateRange(current.from.minusDays(days), current.from.minusDays(1))
      }
      AnalyticsPeriodKind.ALL_TIME -> null
    }
  }

  private fun toInstantRange(range: ClosedDateRange): AnalyticsInstantRange = AnalyticsInstantRange(
    fromInclusive = range.from.atStartOfDay(zoneId).toInstant(),
    toExclusive = range.to.plusDays(1).atStartOfDay(zoneId).toInstant(),
  )

  private data class ClosedDateRange(val from: LocalDate, val to: LocalDate) {
    val days: Long get() = to.toEpochDay() - from.toEpochDay() + 1
  }
}
