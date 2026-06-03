package com.gonezo.recurrence.domain

enum class RecurringMovementReviewPolicy(val value: String) {
  AUTOMATIC("automatic"),
  REQUIRE_USER_CONFIRMATION("require_user_confirmation");

  companion object {
    fun from(value: String): RecurringMovementReviewPolicy =
      entries.firstOrNull { it.value == value.trim().lowercase() }
        ?: throw IllegalArgumentException("Unsupported recurring movement review policy: $value")
  }
}
