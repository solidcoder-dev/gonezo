package com.gonezo.domain.budgeting.ports

import com.gonezo.domain.budgeting.RecurringPattern
import java.util.UUID

interface RecurringPatternRepository {
  fun listActiveByPlan(planId: UUID): List<RecurringPattern>
  fun save(pattern: RecurringPattern)
}
