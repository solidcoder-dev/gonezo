package com.gonezo.recurrence.domain.ports

import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementId
import java.time.Instant

interface RecurringMovementRepository {
  fun save(movement: RecurringMovement)

  fun findById(id: RecurringMovementId): RecurringMovement?

  fun findDue(now: Instant, limit: Int): List<RecurringMovement>

  fun listBySourceAccount(accountId: String): List<RecurringMovement>
}
