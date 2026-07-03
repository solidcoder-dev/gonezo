package com.gonezo.recurrence.application

import com.gonezo.recurrence.domain.RecurringMovementId
import java.util.UUID

sealed class RecurrenceApplicationException(message: String) : IllegalStateException(message)

class RecurringMovementNotFound(recurringMovementId: RecurringMovementId) :
  RecurrenceApplicationException("Recurring movement not found: $recurringMovementId")

class RecurringMovementOccurrenceNotFound(occurrenceId: UUID) :
  RecurrenceApplicationException("Recurring movement occurrence not found: $occurrenceId")
