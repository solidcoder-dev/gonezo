package com.gonezo.sharing.domain.ports

import com.gonezo.sharing.domain.RecurringMovementRef
import com.gonezo.sharing.domain.RecurringSharePlan
import com.gonezo.sharing.domain.RecurringSharePlanId

interface RecurringSharePlanRepository {
  fun save(plan: RecurringSharePlan)
  fun findById(id: RecurringSharePlanId): RecurringSharePlan?
  fun findByRecurringMovementRef(ref: RecurringMovementRef): RecurringSharePlan?
  fun delete(id: RecurringSharePlanId)
}
