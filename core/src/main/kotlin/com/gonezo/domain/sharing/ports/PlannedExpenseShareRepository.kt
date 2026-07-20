package com.gonezo.sharing.domain.ports

import com.gonezo.sharing.domain.ExpectedMovementRef
import com.gonezo.sharing.domain.PlannedExpenseShare
import com.gonezo.sharing.domain.PlannedExpenseShareId

interface PlannedExpenseShareRepository {
  fun save(share: PlannedExpenseShare)
  fun findById(id: PlannedExpenseShareId): PlannedExpenseShare?
  fun findByExpectedMovementRef(ref: ExpectedMovementRef): PlannedExpenseShare?
}
