package com.gonezo.domain.budgeting

enum class EffectiveDatingPolicy(val value: String) {
  USE_EFFECTIVE_DATE("use_effective_date"),
  USE_POSTED_DATE("use_posted_date"),
  ;

  companion object {
    fun from(value: String): EffectiveDatingPolicy =
      entries.firstOrNull { it.value.equals(value, ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported effective dating policy: $value")
  }
}
