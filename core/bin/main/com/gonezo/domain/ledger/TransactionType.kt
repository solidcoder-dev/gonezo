package com.gonezo.ledger.domain

enum class TransactionType(val value: String) {
  INCOME("income"),
  EXPENSE("expense"),
  TRANSFER_OUT("transfer_out"),
  TRANSFER_IN("transfer_in"),
  TRANSFER("transfer"),
  ;

  companion object {
    fun from(value: String): TransactionType =
      entries.firstOrNull { it.value.equals(value, ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported transaction type: $value")
  }
}
