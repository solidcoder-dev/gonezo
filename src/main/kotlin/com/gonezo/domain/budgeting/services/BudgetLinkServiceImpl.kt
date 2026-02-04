package com.gonezo.domain.budgeting.services

import com.gonezo.domain.budgeting.BudgetLink
import com.gonezo.domain.budgeting.BudgetLinkType
import com.gonezo.domain.shared.Money
import java.util.UUID

class BudgetLinkServiceImpl : BudgetLinkService {

  override fun createLink(
    budgetPeriodId: UUID,
    categoryId: UUID,
    linkedType: BudgetLinkType,
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
