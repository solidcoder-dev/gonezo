package com.gonezo.domain.budgeting

enum class ReservationPolicy(val value: String) {
  RESERVE_START_OF_PERIOD("reserve_start_of_period"),
  MANUAL("manual"),
  ;

  companion object {
    fun from(value: String): ReservationPolicy =
      entries.firstOrNull { it.value.equals(value, ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported reservation policy: $value")
  }
}
