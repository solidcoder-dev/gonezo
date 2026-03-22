package com.gonezo.taxonomy.domain

enum class TagStatus(val value: String) {
  ACTIVE("active"),
  ARCHIVED("archived"),
  ;

  companion object {
    fun from(value: String): TagStatus =
      entries.firstOrNull { it.value.equals(value, ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported tag status: $value")
  }
}
