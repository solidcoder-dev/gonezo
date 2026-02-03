package com.gonezo.domain.budgeting

import com.gonezo.domain.shared.Money
import java.util.UUID

data class RecurringPattern(
  val id: UUID,
  val budgetPlanId: UUID,
  val categoryId: UUID,
  val name: String,
  val cadence: String,
  val expectedAmount: Money,
  val tolerance: Money,
  val merchantMatcher: String,
  val billingDay: Int?,
  val billingMonth: Int?,
  val proration: String?,
  val active: Boolean,
)
