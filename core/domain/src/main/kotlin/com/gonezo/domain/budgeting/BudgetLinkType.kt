package com.gonezo.domain.budgeting

enum class BudgetLinkType(val value: String) {
  TRANSACTION("transaction"),
  INVESTMENT_TRANSACTION("investment_transaction"),
  ;

  companion object {
    fun from(value: String): BudgetLinkType =
      entries.firstOrNull { it.value.equals(value, ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported budget link type: $value")
  }
}
