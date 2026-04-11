package com.gonezo.recurrence.domain

import java.time.DayOfWeek

data class RecurrenceRule(
  val frequency: RecurrenceFrequency,
  val interval: Int = 1,
  val weeklyDays: Set<DayOfWeek> = emptySet(),
  val monthlyPattern: MonthlyPattern = MonthlyPattern.DAY_OF_MONTH,
  val dayOfMonth: Int? = null,
  val monthlyWeekOrdinal: Int? = null,
  val monthlyWeekday: DayOfWeek? = null,
) {
  init {
    require(interval > 0) { "recurrence interval must be greater than 0" }
  }
}
