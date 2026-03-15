package com.gonezo.domain.ledger

data class CurrencyCode(val value: String) {
  init {
    require(value.matches(Regex("^[A-Z]{3}$"))) { "currency code must be 3 uppercase letters" }
    require(ALLOWED.contains(value)) { "unsupported currency code: $value" }
  }

  companion object {
    private val ALLOWED = setOf(
      "USD",
      "EUR",
      "GBP",
      "JPY",
      "CHF",
      "CAD",
      "AUD",
      "NZD",
      "MXN",
      "BRL",
    )

    fun from(raw: String): CurrencyCode = CurrencyCode(raw.trim().uppercase())

    fun supported(): List<CurrencyCode> = ALLOWED.sorted().map(::CurrencyCode)
  }

  override fun toString(): String = value
}
