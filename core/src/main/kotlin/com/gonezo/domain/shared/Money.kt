package com.gonezo.domain.shared

import java.math.BigDecimal

data class Money(
  val amount: BigDecimal,
  val currency: String,
) {
  init {
    require(currency.isNotBlank()) { "currency must not be blank" }
  }

  companion object {
    fun of(amount: BigDecimal, currency: String): Money =
      Money(amount = amount, currency = CurrencyCode.from(currency).value)
  }
}
