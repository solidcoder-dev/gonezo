package com.gonezo.recurrence.domain

enum class RecurrenceFrequency(val value: String) {
  DAILY("daily"),
  WEEKLY("weekly"),
  MONTHLY("monthly"),
  YEARLY("yearly"),
  ;

  companion object {
    fun from(value: String): RecurrenceFrequency =
      entries.firstOrNull { it.value.equals(value.trim(), ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported recurrence frequency: $value")
  }
}
