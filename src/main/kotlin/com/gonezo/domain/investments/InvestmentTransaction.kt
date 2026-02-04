package com.gonezo.domain.investments

import com.gonezo.domain.shared.Money
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

data class InvestmentTransaction(
  val id: UUID,
  val containerId: UUID,
  val date: LocalDate,
  val type: InvestmentTransactionType,
  val assetId: UUID?,
  val quantity: BigDecimal?,
  val amount: Money,
  val fees: Money?,
  val taxes: Money?,
  val note: String?,
)
