package com.gonezo.application.services

import com.gonezo.domain.budgeting.ports.BudgetPeriodRepository
import com.gonezo.domain.budgeting.ports.CategoryBalanceRepository
import com.gonezo.domain.budgeting.ports.CategoryRepository
import com.gonezo.domain.shared.Money
import com.gonezo.domain.shared.YearMonth
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

@Service
class CategoryBalanceUpdaterService(
  private val categoryRepository: CategoryRepository,
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

    val updated = current.copy(
      spent = Money(newSpent, amount.currency),
      available = Money(newAvailable, amount.currency),
      safeToSpend = Money(newSafeToSpend, amount.currency),
    )

    categoryBalanceRepository.save(updated)
  }
}
