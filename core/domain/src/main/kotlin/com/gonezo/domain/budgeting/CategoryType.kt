package com.gonezo.domain.budgeting

enum class CategoryType(val value: String) {
  SPENDING("spending"),
  SINKING_FUND("sinking_fund"),
  SAVINGS_GOAL("savings_goal"),
  ;

  companion object {
    fun from(value: String): CategoryType =
      entries.firstOrNull { it.value.equals(value, ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported category type: $value")
  }
}
