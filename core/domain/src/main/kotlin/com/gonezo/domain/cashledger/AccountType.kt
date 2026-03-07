package com.gonezo.domain.cashledger

enum class AccountType(val value: String) {
  BANK("bank"),
  CASH("cash"),
  CARD("card"),
  INVESTMENT("investment"),
  OTHER("other"),
  ;

  companion object {
    fun from(value: String): AccountType =
      entries.firstOrNull { it.value.equals(value, ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported account type: $value")
  }
}
