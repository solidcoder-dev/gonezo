package com.gonezo.domain.budgeting

enum class NegativePolicy(val value: String) {
  ALLOW_WITH_MAX_DEBT("allow_with_max_debt"),
  DISALLOW("disallow"),
  ;

  companion object {
    fun from(value: String): NegativePolicy =
      entries.firstOrNull { it.value.equals(value, ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported negative policy: $value")
  }
}
