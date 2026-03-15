package com.gonezo.domain.ledger

enum class TransactionType(val value: String) {
  INCOME("income"),
  EXPENSE("expense"),
  TRANSFER("transfer"),
  ;

  companion object {
    fun from(value: String): TransactionType =
      entries.firstOrNull { it.value.equals(value, ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported transaction type: $value")
  }
}
