package com.gonezo.domain.budgeting

enum class ReservationStatus(val value: String) {
  ACTIVE("active"),
  SETTLED("settled"),
  CANCELLED("cancelled"),
  ;

  companion object {
    fun from(value: String): ReservationStatus =
      entries.firstOrNull { it.value.equals(value, ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported reservation status: $value")
  }
}
