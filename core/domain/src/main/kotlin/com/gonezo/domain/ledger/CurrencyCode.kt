package com.gonezo.domain.ledger

data class CurrencyCode(val value: String) {
  init {
    require(value.matches(Regex("^[A-Z]{3}$"))) { "currency code must be 3 uppercase letters" }
  }

  companion object {
    fun from(raw: String): CurrencyCode = CurrencyCode(raw.trim().uppercase())
  }

  override fun toString(): String = value
}
