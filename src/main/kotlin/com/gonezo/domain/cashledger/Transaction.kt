package com.gonezo.domain.cashledger

import com.gonezo.domain.shared.Money
import java.time.LocalDate
import java.util.UUID

data class Transaction(
  val id: UUID,
  val accountId: UUID,
  val postedDate: LocalDate,
  val effectiveDate: LocalDate,
  val amount: Money,
  val type: TransactionType,
  val merchant: String?,
  val categoryId: UUID?,
  val recurring: Boolean,
)
