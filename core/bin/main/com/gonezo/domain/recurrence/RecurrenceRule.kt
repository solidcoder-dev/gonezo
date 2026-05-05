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
    when (frequency) {
      RecurrenceFrequency.DAILY -> {
        require(weeklyDays.isEmpty()) { "weeklyDays is not supported for daily recurrence" }
        require(dayOfMonth == null) { "dayOfMonth is not supported for daily recurrence" }
        require(monthlyWeekOrdinal == null) { "monthlyWeekOrdinal is not supported for daily recurrence" }
        require(monthlyWeekday == null) { "monthlyWeekday is not supported for daily recurrence" }
      }

      RecurrenceFrequency.WEEKLY -> {
        require(weeklyDays.isNotEmpty()) { "weekly recurrence requires at least one day" }
        require(dayOfMonth == null) { "dayOfMonth is not supported for weekly recurrence" }
        require(monthlyWeekOrdinal == null) { "monthlyWeekOrdinal is not supported for weekly recurrence" }
        require(monthlyWeekday == null) { "monthlyWeekday is not supported for weekly recurrence" }
      }

      RecurrenceFrequency.MONTHLY -> {
        when (monthlyPattern) {
          MonthlyPattern.DAY_OF_MONTH -> {
            if (dayOfMonth != null) {
              require(dayOfMonth in 1..31) { "dayOfMonth must be between 1 and 31" }
            }
            require(monthlyWeekOrdinal == null) { "monthlyWeekOrdinal is not supported for day-of-month recurrence" }
            require(monthlyWeekday == null) { "monthlyWeekday is not supported for day-of-month recurrence" }
          }

          MonthlyPattern.NTH_WEEKDAY -> {
            require(monthlyWeekOrdinal != null) { "monthlyWeekOrdinal is required for nth-weekday recurrence" }
            require(monthlyWeekOrdinal in 1..5) { "monthlyWeekOrdinal must be between 1 and 5" }
            require(monthlyWeekday != null) { "monthlyWeekday is required for nth-weekday recurrence" }
            require(dayOfMonth == null) { "dayOfMonth is not supported for nth-weekday recurrence" }
          }
        }
      }

      RecurrenceFrequency.YEARLY -> {
        require(weeklyDays.isEmpty()) { "weeklyDays is not supported for yearly recurrence" }
        require(dayOfMonth == null) { "dayOfMonth is not supported for yearly recurrence" }
        require(monthlyWeekOrdinal == null) { "monthlyWeekOrdinal is not supported for yearly recurrence" }
        require(monthlyWeekday == null) { "monthlyWeekday is not supported for yearly recurrence" }
      }
    }
  }
}
