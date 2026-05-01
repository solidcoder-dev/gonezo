package com.gonezo.expected.domain

enum class ExpectedMovementType(val value: String) {
  INCOME("income"),
  EXPENSE("expense"),
  ;

  companion object {
    fun from(value: String): ExpectedMovementType =
      entries.firstOrNull { it.value.equals(value.trim(), ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported expected movement type: $value")
  }
}
