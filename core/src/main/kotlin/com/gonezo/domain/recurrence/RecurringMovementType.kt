package com.gonezo.recurrence.domain

enum class RecurringMovementType(val value: String) {
  EXPENSE("expense"),
  INCOME("income"),
  TRANSFER("transfer"),
  ;

  companion object {
    fun from(value: String): RecurringMovementType =
      entries.firstOrNull { it.value.equals(value.trim(), ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported recurring movement type: $value")
  }
}
