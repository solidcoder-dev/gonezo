package com.gonezo.application.services

import com.gonezo.domain.budgeting.ports.BudgetPeriodRepository
import com.gonezo.domain.shared.Money
import com.gonezo.domain.shared.YearMonth
import org.springframework.stereotype.Service
import java.time.LocalDate
import java.util.UUID

@Service
class BudgetPeriodTotalsService(
  private val budgetPeriodRepository: BudgetPeriodRepository,
) {

  fun applyIncome(planId: UUID, effectiveDate: LocalDate, amount: Money) {
    val period = budgetPeriodRepository.getByYearMonth(
      planId,
      YearMonth(effectiveDate.year, effectiveDate.monthValue),
    )

    val newIncomeTotal = Money(period.incomeTotal.amount.add(amount.amount), amount.currency)
    val newRemainder = Money(period.remainder.amount.add(amount.amount), amount.currency)

    budgetPeriodRepository.updateTotals(period.id, newIncomeTotal, newRemainder)
  }
}
