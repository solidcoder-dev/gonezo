package com.gonezo.recurrence.domain

enum class RecurringMovementOccurrenceStatus(val value: String) {
  PENDING("pending"),
  POSTED("posted"),
  FAILED("failed"),
  ;

  companion object {
    fun from(value: String): RecurringMovementOccurrenceStatus =
      entries.firstOrNull { it.value.equals(value.trim(), ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported recurring movement occurrence status: $value")
  }
}
