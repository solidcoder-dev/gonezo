package com.gonezo.domain.budgeting.ports

import com.gonezo.domain.budgeting.Category
import java.util.UUID

interface CategoryRepository {
  fun listByPlan(planId: UUID): List<Category>
}
