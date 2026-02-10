package com.gonezo.domain.budgeting.services

import com.gonezo.domain.budgeting.BudgetLink
import com.gonezo.domain.budgeting.BudgetLinkType
import com.gonezo.domain.shared.Money
import java.util.UUID

interface BudgetLinkService {
  fun createLink(
    budgetPeriodId: UUID,
    categoryId: UUID,
    linkedType: BudgetLinkType,
    linkedId: UUID,
    budgetImpactAmount: Money,
  ): BudgetLink
}
