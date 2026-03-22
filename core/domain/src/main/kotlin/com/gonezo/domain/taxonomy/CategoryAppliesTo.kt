package com.gonezo.domain.taxonomy

enum class CategoryAppliesTo(val value: String) {
  INCOME("income"),
  EXPENSE("expense"),
  ;

  companion object {
    fun from(value: String): CategoryAppliesTo =
      entries.firstOrNull { it.value.equals(value, ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported category appliesTo: $value")
  }
}
