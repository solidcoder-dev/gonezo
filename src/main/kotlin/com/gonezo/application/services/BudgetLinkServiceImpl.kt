package com.gonezo.application.services

import com.gonezo.domain.budgeting.BudgetLink
import com.gonezo.domain.budgeting.services.BudgetLinkService
import com.gonezo.domain.shared.Money
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class BudgetLinkServiceImpl : BudgetLinkService {

  override fun createLink(
    budgetPeriodId: UUID,
    categoryId: UUID,
    linkedType: String,
    linkedId: UUID,
    budgetImpactAmount: Money,
  ): BudgetLink {
    return BudgetLink(
      id = UUID.randomUUID(),
      budgetPeriodId = budgetPeriodId,
      categoryId = categoryId,
      linkedType = linkedType,
      linkedId = linkedId,
      budgetImpactAmount = budgetImpactAmount,
    )
  }
}
