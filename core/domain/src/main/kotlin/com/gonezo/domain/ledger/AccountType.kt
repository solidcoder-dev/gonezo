package com.gonezo.ledger.domain

enum class AccountType(val value: String) {
  BANK("bank"),
  CASH("cash"),
  CARD("card"),
  WALLET("wallet"),
  SAVINGS("savings"),
  OTHER("other"),
  ;

  companion object {
    fun from(value: String): AccountType =
      entries.firstOrNull { it.value.equals(value, ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported account type: $value")
  }
}
