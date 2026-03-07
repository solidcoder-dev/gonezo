package com.gonezo.domain.investments

enum class InvestmentTransactionType(val value: String) {
  DEPOSIT("deposit"),
  WITHDRAWAL("withdrawal"),
  BUY("buy"),
  SELL("sell"),
  DIVIDEND("dividend"),
  INTEREST("interest"),
  FEE("fee"),
  RETURN("return"),
  ;

  companion object {
    fun from(value: String): InvestmentTransactionType =
      entries.firstOrNull { it.value.equals(value, ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported investment type: $value")
  }
}
