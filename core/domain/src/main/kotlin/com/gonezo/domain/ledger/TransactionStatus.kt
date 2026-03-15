package com.gonezo.domain.ledger

enum class TransactionStatus(val value: String) {
  DRAFT("draft"),
  POSTED("posted"),
  VOIDED("voided"),
  ;

  companion object {
    fun from(value: String): TransactionStatus =
      entries.firstOrNull { it.value.equals(value, ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported transaction status: $value")
  }
}
