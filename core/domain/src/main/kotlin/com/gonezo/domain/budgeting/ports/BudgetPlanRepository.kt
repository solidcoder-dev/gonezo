package com.gonezo.domain.budgeting.ports

import com.gonezo.domain.budgeting.BudgetPlan
import java.util.UUID

interface BudgetPlanRepository {
  fun get(id: UUID): BudgetPlan
  fun save(plan: BudgetPlan)
}
