package com.gonezo.recurrence.domain

enum class RecurringMovementStatus(val value: String) {
  ACTIVE("active"),
  DEACTIVATED("deactivated"),
  COMPLETED("completed"),
  ;

  companion object {
    fun from(value: String): RecurringMovementStatus =
      entries.firstOrNull { it.value.equals(value.trim(), ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported recurring movement status: $value")
  }
}
