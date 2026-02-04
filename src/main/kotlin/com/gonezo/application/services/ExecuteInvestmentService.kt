package com.gonezo.application.services

import com.gonezo.application.ExecuteInvestmentCommand
import com.gonezo.application.ExecuteInvestmentUC
import com.gonezo.domain.budgeting.ports.BudgetLinkRepository
import com.gonezo.domain.budgeting.services.BudgetLinkService
import com.gonezo.domain.investments.InvestmentTransaction
import com.gonezo.domain.investments.ports.FinancialContainerRepository
import com.gonezo.domain.investments.ports.InvestmentTransactionRepository
import com.gonezo.domain.investments.services.InvestmentExecutionService
import com.gonezo.domain.shared.Money
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.util.UUID

@Service
class ExecuteInvestmentService(
  private val investmentExecutionService: InvestmentExecutionService,
  private val investmentTransactionRepository: InvestmentTransactionRepository,
  private val financialContainerRepository: FinancialContainerRepository,
  private val budgetLinkImpactService: BudgetLinkImpactService,
) : ExecuteInvestmentUC {

  @Transactional
  override fun execute(command: ExecuteInvestmentCommand): UUID {
    financialContainerRepository.get(command.containerId)

    val transaction = InvestmentTransaction(
      id = UUID.randomUUID(),
      containerId = command.containerId,
      date = command.date,
      type = command.type,
      assetId = command.assetId,
      quantity = command.quantity,
      amount = command.amount,
      fees = command.fees,
      note = command.note,
    )

    val executed = investmentExecutionService.execute(transaction)
    investmentTransactionRepository.save(executed)

    val budgetPeriodId = command.budgetPeriodId
    val categoryId = command.categoryId
    if (budgetPeriodId != null && categoryId != null) {
      val total = executed.amount.amount.add(executed.fees?.amount ?: BigDecimal.ZERO)
      val budgetImpact = Money(total, executed.amount.currency)
      budgetLinkImpactService.applyLink(
        budgetPeriodId = budgetPeriodId,
        categoryId = categoryId,
        linkedId = executed.id,
        budgetImpactAmount = budgetImpact,
        effectiveDate = executed.date,
      )
    }

    return executed.id
  }
}
