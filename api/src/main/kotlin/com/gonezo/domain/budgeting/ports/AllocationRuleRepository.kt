package com.gonezo.domain.budgeting.ports

import com.gonezo.domain.budgeting.AllocationRule
import java.util.UUID

interface AllocationRuleRepository {
  fun listByPlan(planId: UUID): List<AllocationRule>
}
