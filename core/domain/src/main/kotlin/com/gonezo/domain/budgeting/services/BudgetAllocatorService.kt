package com.gonezo.domain.budgeting.services

import com.gonezo.domain.budgeting.AllocationRule
import com.gonezo.domain.budgeting.BudgetPeriod
import com.gonezo.domain.budgeting.Category
import com.gonezo.domain.budgeting.CategoryBalance

interface BudgetAllocatorService {
  fun allocate(
    period: BudgetPeriod,
    rules: List<AllocationRule>,
    categories: List<Category>,
  ): List<CategoryBalance>
}
