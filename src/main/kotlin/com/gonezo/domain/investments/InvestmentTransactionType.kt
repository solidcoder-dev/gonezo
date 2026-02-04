package com.gonezo.domain.investments

enum class InvestmentTransactionType(val value: String) {
  BUY("buy"),
  SELL("sell"),
  DIVIDEND("dividend"),
  RETURN("return"),
  ;

  companion object {
    fun from(value: String): InvestmentTransactionType =
      entries.firstOrNull { it.value.equals(value, ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported investment type: $value")
  }
}
