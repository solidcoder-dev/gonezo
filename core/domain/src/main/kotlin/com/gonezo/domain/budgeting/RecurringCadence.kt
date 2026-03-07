package com.gonezo.domain.budgeting

enum class RecurringCadence(val value: String) {
  MONTHLY("monthly"),
  YEARLY("yearly"),
  ;

  companion object {
    fun from(value: String): RecurringCadence =
      entries.firstOrNull { it.value.equals(value, ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported cadence: $value")
  }
}
