package com.gonezo.domain.budgeting

import com.gonezo.domain.shared.Percent
import java.util.UUID

data class AllocationRule(
  val id: UUID,
  val budgetPlanId: UUID,
  val categoryId: UUID,
  val percentOfRemainder: Percent,
)
