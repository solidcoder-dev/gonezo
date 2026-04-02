package com.gonezo.taxonomy.domain

enum class CategoryStatus(val value: String) {
  ACTIVE("active"),
  ARCHIVED("archived"),
  ;

  companion object {
    fun from(value: String): CategoryStatus =
      entries.firstOrNull { it.value.equals(value, ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported category status: $value")
  }
}
