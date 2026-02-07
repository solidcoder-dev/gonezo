package com.gonezo.domain.budgeting.services

import com.gonezo.domain.budgeting.AllocationRule
import com.gonezo.domain.budgeting.BudgetPlan
import com.gonezo.domain.budgeting.BudgetPeriod
import com.gonezo.domain.budgeting.Category
import com.gonezo.domain.budgeting.CategoryBalance
import com.gonezo.domain.budgeting.NegativePolicy
import com.gonezo.domain.budgeting.ports.BudgetPlanRepository
import com.gonezo.domain.shared.Money
import com.gonezo.domain.shared.PolicyViolationException
import java.math.BigDecimal
import java.math.RoundingMode
import java.util.UUID

class BudgetAllocatorServiceImpl(
  private val budgetPlanRepository: BudgetPlanRepository,
) : BudgetAllocatorService {

  override fun allocate(
    period: BudgetPeriod,
    rules: List<AllocationRule>,
    categories: List<Category>,
  ): List<CategoryBalance> {
    val plan = budgetPlanRepository.get(period.budgetPlanId)
    val categoryMap = categories.associateBy { it.id }
    val currency = period.remainder.currency
    val zero = Money(BigDecimal.ZERO.setScale(2), currency)

    return rules.map { rule ->
      val category = categoryMap.getValue(rule.categoryId)
      val allocatedAmount = period.remainder.amount
        .multiply(rule.percentOfRemainder.value)
        .setScale(2, RoundingMode.HALF_UP)

      val allocated = Money(allocatedAmount, currency)
      enforceNegativePolicies(plan, category, allocatedAmount)

      CategoryBalance(
        id = UUID.randomUUID(),
        budgetPeriodId = period.id,
        categoryId = category.id,
        openingBalance = zero,
        allocated = allocated,
        spent = zero,
        available = allocated,
        reserved = zero,
        safeToSpend = allocated,
      )
    }
  }

  private fun enforceNegativePolicies(
    plan: BudgetPlan,
    category: Category,
    availableAmount: BigDecimal,
  ) {
    if (availableAmount >= BigDecimal.ZERO) return

    if (plan.negativePolicy == NegativePolicy.DISALLOW) {
      throw PolicyViolationException("Budget plan disallows negative balances.")
    }

    if (!category.allowNegative) {
      throw PolicyViolationException("Category balance cannot go negative.")
    }

    val maxDebtAmount = category.maxDebtAmount
      ?: throw PolicyViolationException("Category balance exceeded max debt.")
    val limit = maxDebtAmount.amount.negate()
    if (availableAmount < limit) {
      throw PolicyViolationException("Category balance exceeded max debt.")
    }
  }
}
