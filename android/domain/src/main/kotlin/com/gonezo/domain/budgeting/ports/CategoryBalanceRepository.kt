package com.gonezo.domain.budgeting.ports

import com.gonezo.domain.budgeting.CategoryBalance
import java.util.UUID

interface CategoryBalanceRepository {
  fun save(balance: CategoryBalance)
  fun findByPeriodAndCategory(periodId: UUID, categoryId: UUID): CategoryBalance?
  fun listByPeriod(periodId: UUID): List<CategoryBalance>
}
