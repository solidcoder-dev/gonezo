package com.gonezo.expected.domain

enum class ExpectedMovementStatus(val value: String) {
  PENDING("pending"),
  RESOLVED("resolved"),
  DISMISSED("dismissed"),
  ;

  companion object {
    fun from(value: String): ExpectedMovementStatus =
      entries.firstOrNull { it.value.equals(value.trim(), ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported expected movement status: $value")
  }
}
