package com.gonezo.domain.budgeting.ports

import com.gonezo.domain.budgeting.Category
import java.util.UUID

interface CategoryRepository {
  fun get(id: UUID): Category
  fun listByPlan(planId: UUID): List<Category>
}
