package com.gonezo.recurrence.domain.ports

import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementOccurrence
import java.time.Instant
import java.util.UUID

interface RecurringMovementOccurrenceRepository {
  fun save(occurrence: RecurringMovementOccurrence)

  fun findById(id: UUID): RecurringMovementOccurrence?

  fun findByRecurringMovementAndDueAt(
    recurringMovementId: RecurringMovementId,
    dueAt: Instant,
  ): RecurringMovementOccurrence?

  fun listByRecurringMovement(recurringMovementId: RecurringMovementId): List<RecurringMovementOccurrence>
}
