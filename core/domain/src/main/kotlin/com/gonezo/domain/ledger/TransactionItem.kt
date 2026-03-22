package com.gonezo.domain.ledger

import com.gonezo.domain.shared.Money
import java.math.BigDecimal

data class TransactionItem(
  val id: TransactionItemId,
  val name: String,
  val amount: Money,
  val note: String?,
) {
  init {
    require(name.isNotBlank()) { "item name is required" }
    require(amount.amount > BigDecimal.ZERO) { "item amount must be > 0" }
    require(amount.currency.isNotBlank()) { "item currency is required" }
  }

  companion object {
    fun create(
      id: TransactionItemId,
      name: String,
      amount: Money,
      note: String?,
    ): TransactionItem = TransactionItem(
      id = id,
      name = name.trim(),
      amount = amount,
      note = note?.trim()?.ifBlank { null },
    )
  }
}
