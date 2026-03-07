package com.gonezo.application.services
import com.gonezo.domain.budgeting.ports.BudgetLinkRepository
import com.gonezo.domain.budgeting.services.BudgetLinkService
import com.gonezo.domain.budgeting.BudgetLinkType
import com.gonezo.domain.shared.Money
import java.util.UUID
class BudgetLinkImpactService(
  private val budgetLinkService: BudgetLinkService,
  private val budgetLinkRepository: BudgetLinkRepository,
  private val categoryBalanceUpdaterService: CategoryBalanceUpdaterService,
) {
  fun applyLink(
    budgetPeriodId: UUID,
    categoryId: UUID,
    linkedId: UUID,
    budgetImpactAmount: Money,
    effectiveDate: java.time.LocalDate,
  ) {
    val link = budgetLinkService.createLink(
      budgetPeriodId = budgetPeriodId,
      categoryId = categoryId,
      linkedType = BudgetLinkType.INVESTMENT_TRANSACTION,
      linkedId = linkedId,
      budgetImpactAmount = budgetImpactAmount,
    )
    budgetLinkRepository.save(link)
    categoryBalanceUpdaterService.applyExpense(
      categoryId = categoryId,
      effectiveDate = effectiveDate,
      amount = budgetImpactAmount,
    )
  }
}
