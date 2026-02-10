package com.gonezo.domain.budgeting

enum class BudgetPlanPeriod(val value: String) {
  MONTHLY("monthly"),
  ;

  companion object {
    fun from(value: String): BudgetPlanPeriod =
      entries.firstOrNull { it.value.equals(value, ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported budget period: $value")
  }
}
