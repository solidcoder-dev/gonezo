package com.gonezo.recurrence.domain

enum class RecurrenceOutboxStatus(val value: String) {
  PENDING("pending"),
  PUBLISHED("published"),
  FAILED("failed"),
  ;

  companion object {
    fun from(value: String): RecurrenceOutboxStatus =
      entries.firstOrNull { it.value.equals(value.trim(), ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported recurrence outbox status: $value")
  }
}
