package com.gonezo.domain.budgeting

enum class ProrationType(val value: String) {
  NONE("none"),
  MONTHLY("monthly"),
  ;

  companion object {
    fun from(value: String?): ProrationType? {
      if (value == null) return null
      return entries.firstOrNull { it.value.equals(value, ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported proration: $value")
    }
  }
}
