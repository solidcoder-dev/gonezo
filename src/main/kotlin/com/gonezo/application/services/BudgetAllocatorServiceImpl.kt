package com.gonezo.application.services

import com.gonezo.domain.budgeting.AllocationRule
import com.gonezo.domain.budgeting.BudgetPeriod
import com.gonezo.domain.budgeting.Category
import com.gonezo.domain.budgeting.CategoryBalance
import com.gonezo.domain.budgeting.services.BudgetAllocatorService
import com.gonezo.domain.shared.Money
import com.gonezo.application.PolicyViolationException
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.util.UUID

@Service
class BudgetAllocatorServiceImpl : BudgetAllocatorService {

  override fun allocate(
    period: BudgetPeriod,
    rules: List<AllocationRule>,
    categories: List<Category>,
  ): List<CategoryBalance> {
    val categoryMap = categories.associateBy { it.id }
    val currency = period.remainder.currency
    val zero = Money(BigDecimal.ZERO.setScale(2), currency)

    return rules.map { rule ->
      val category = categoryMap.getValue(rule.categoryId)
      val allocatedAmount = period.remainder.amount
        .multiply(rule.percentOfRemainder.value)
        .setScale(2, RoundingMode.HALF_UP)

      val allocated = Money(allocatedAmount, currency)
      enforceNegativePolicies(category.allowNegative, category.maxDebtAmount, allocatedAmount)

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
    allowNegative: Boolean,
    maxDebtAmount: Money?,
    availableAmount: BigDecimal,
  ) {
    if (!allowNegative && availableAmount < BigDecimal.ZERO) {
      throw PolicyViolationException("Category balance cannot go negative.")
    }

    if (maxDebtAmount != null) {
      val limit = maxDebtAmount.amount.negate()
      if (availableAmount < limit) {
        throw PolicyViolationException("Category balance exceeded max debt.")
      }
    }
  }
}
