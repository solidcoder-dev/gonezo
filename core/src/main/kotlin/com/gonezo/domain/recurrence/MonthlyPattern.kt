package com.gonezo.recurrence.domain

enum class MonthlyPattern(val value: String) {
  DAY_OF_MONTH("day_of_month"),
  NTH_WEEKDAY("nth_weekday"),
  ;

  companion object {
    fun from(value: String): MonthlyPattern =
      entries.firstOrNull { it.value.equals(value.trim(), ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported monthly pattern: $value")
  }
}
