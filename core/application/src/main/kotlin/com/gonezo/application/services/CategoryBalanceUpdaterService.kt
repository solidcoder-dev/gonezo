package com.gonezo.application.services
import com.gonezo.domain.budgeting.NegativePolicy
import com.gonezo.domain.budgeting.ports.BudgetPeriodRepository
import com.gonezo.domain.budgeting.ports.BudgetPlanRepository
import com.gonezo.domain.budgeting.ports.CategoryBalanceRepository
import com.gonezo.domain.budgeting.ports.CategoryRepository
import com.gonezo.domain.shared.Money
import com.gonezo.domain.shared.YearMonth
import com.gonezo.domain.shared.PolicyViolationException
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID
class CategoryBalanceUpdaterService(
  private val categoryRepository: CategoryRepository,
  private val budgetPlanRepository: BudgetPlanRepository,
  private val budgetPeriodRepository: BudgetPeriodRepository,
  private val categoryBalanceRepository: CategoryBalanceRepository,
) {
  fun applyExpense(categoryId: UUID, effectiveDate: LocalDate, amount: Money) {
    val category = categoryRepository.get(categoryId)
    val period = budgetPeriodRepository.getByYearMonth(
      category.budgetPlanId,
      YearMonth(effectiveDate.year, effectiveDate.monthValue),
    )
    val existing = categoryBalanceRepository.findByPeriodAndCategory(period.id, categoryId)
    val zero = Money(BigDecimal.ZERO, amount.currency)
    val current = existing ?: com.gonezo.domain.budgeting.CategoryBalance(
      id = UUID.randomUUID(),
      budgetPeriodId = period.id,
      categoryId = categoryId,
      openingBalance = zero,
      allocated = zero,
      spent = zero,
      available = zero,
      reserved = zero,
      safeToSpend = zero,
    )
    val newSpent = current.spent.amount.add(amount.amount)
    val newAvailable = current.openingBalance.amount
      .add(current.allocated.amount)
      .subtract(newSpent)
    val newSafeToSpend = newAvailable.subtract(current.reserved.amount)
    val plan = budgetPlanRepository.get(category.budgetPlanId)
    enforceNegativePolicies(plan.negativePolicy, category.allowNegative, category.maxDebtAmount, newAvailable)
    val updated = current.copy(
      spent = Money(newSpent, amount.currency),
      available = Money(newAvailable, amount.currency),
      safeToSpend = Money(newSafeToSpend, amount.currency),
    )
    categoryBalanceRepository.save(updated)
  }
  fun applyIncome(categoryId: UUID, effectiveDate: LocalDate, amount: Money) {
    val category = categoryRepository.get(categoryId)
    val period = budgetPeriodRepository.getByYearMonth(
      category.budgetPlanId,
      YearMonth(effectiveDate.year, effectiveDate.monthValue),
    )
    val existing = categoryBalanceRepository.findByPeriodAndCategory(period.id, categoryId)
    val zero = Money(BigDecimal.ZERO, amount.currency)
    val current = existing ?: com.gonezo.domain.budgeting.CategoryBalance(
      id = UUID.randomUUID(),
      budgetPeriodId = period.id,
      categoryId = categoryId,
      openingBalance = zero,
      allocated = zero,
      spent = zero,
      available = zero,
      reserved = zero,
      safeToSpend = zero,
    )
    val newAvailable = current.available.amount.add(amount.amount)
    val newSafeToSpend = newAvailable.subtract(current.reserved.amount)
    val updated = current.copy(
      available = Money(newAvailable, amount.currency),
      safeToSpend = Money(newSafeToSpend, amount.currency),
    )
    categoryBalanceRepository.save(updated)
  }
  private fun enforceNegativePolicies(
    negativePolicy: NegativePolicy,
    allowNegative: Boolean,
    maxDebtAmount: Money?,
    availableAmount: BigDecimal,
  ) {
    if (availableAmount >= BigDecimal.ZERO) return
    if (negativePolicy == NegativePolicy.DISALLOW) {
      throw PolicyViolationException("Budget plan disallows negative balances.")
    }
    if (!allowNegative) {
      throw PolicyViolationException("Category balance cannot go negative.")
    }
    val maxDebt = maxDebtAmount ?: throw PolicyViolationException("Category balance exceeded max debt.")
    val limit = maxDebt.amount.negate()
    if (availableAmount < limit) {
      throw PolicyViolationException("Category balance exceeded max debt.")
    }
  }
}
