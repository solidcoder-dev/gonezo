package com.gonezo.domain.budgeting.ports

import com.gonezo.domain.budgeting.BudgetPeriod
import com.gonezo.domain.shared.Money
import com.gonezo.domain.shared.YearMonth
import java.util.UUID

interface BudgetPeriodRepository {
  fun get(id: UUID): BudgetPeriod
  fun getByYearMonth(planId: UUID, yearMonth: YearMonth): BudgetPeriod
  fun save(period: BudgetPeriod)
  fun updateTotals(id: UUID, incomeTotal: Money, remainder: Money)
}
