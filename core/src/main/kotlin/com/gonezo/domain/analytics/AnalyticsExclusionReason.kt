package com.gonezo.analytics.domain

enum class AnalyticsExclusionReason(val value: String) {
  USER_IGNORED("user_ignored"),
  SHARED_EXPENSE("shared_expense"),
  REIMBURSEMENT("reimbursement"),
  ;

  companion object {
    fun from(value: String): AnalyticsExclusionReason =
      entries.firstOrNull { it.value.equals(value.trim(), ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported analytics exclusion reason: $value")
  }
}
