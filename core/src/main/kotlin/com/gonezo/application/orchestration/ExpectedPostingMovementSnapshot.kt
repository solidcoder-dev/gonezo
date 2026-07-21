package com.gonezo.application.orchestration

import com.gonezo.domain.shared.CurrencyCode
import com.gonezo.expected.domain.ExpectedMovementType
import com.gonezo.ledger.domain.AccountId
import java.math.BigDecimal

data class ExpectedPostingSplitItem(
  val id: String,
  val name: String,
  val amount: BigDecimal,
) {
  init {
    require(id.isNotBlank()) { "split item id is required" }
    require(name.isNotBlank()) { "split item name is required" }
    require(amount > BigDecimal.ZERO) { "split item amount must be greater than 0" }
  }
}

data class ExpectedPostingMovementSnapshot(
  val accountId: String,
  val type: ExpectedMovementType,
  val amount: BigDecimal,
  val currency: String,
  val description: String?,
  val merchant: String?,
  val splitItems: List<ExpectedPostingSplitItem>,
) {
  init {
    AccountId.from(accountId)
    CurrencyCode.from(currency)
    require(amount > BigDecimal.ZERO) { "amount must be greater than 0" }
  }
}
