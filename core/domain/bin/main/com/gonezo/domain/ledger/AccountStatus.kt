package com.gonezo.ledger.domain

enum class AccountStatus(val value: String) {
  ACTIVE("active"),
  ARCHIVED("archived"),
  ;

  companion object {
    fun from(value: String): AccountStatus =
      entries.firstOrNull { it.value.equals(value, ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported account status: $value")
  }
}
