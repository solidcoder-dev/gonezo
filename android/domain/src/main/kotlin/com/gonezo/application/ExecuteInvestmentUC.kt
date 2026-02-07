package com.gonezo.application

import com.gonezo.domain.shared.Money
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

data class ExecuteInvestmentCommand(
  val containerId: UUID,
  val date: LocalDate,
  val type: com.gonezo.domain.investments.InvestmentTransactionType,
  val assetId: UUID?,
  val quantity: BigDecimal?,
  val amount: Money,
  val fees: Money?,
  val taxes: Money?,
  val note: String?,
  val budgetPeriodId: UUID?,
  val categoryId: UUID?,
)

interface ExecuteInvestmentUC {
  fun execute(command: ExecuteInvestmentCommand): UUID
}
