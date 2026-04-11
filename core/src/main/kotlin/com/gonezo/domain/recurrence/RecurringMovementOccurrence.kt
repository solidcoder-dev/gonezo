package com.gonezo.recurrence.domain

import java.time.Instant
import java.util.UUID

data class RecurringMovementOccurrence(
  val id: UUID,
  val recurringMovementId: RecurringMovementId,
  val dueAt: Instant,
  val status: RecurringMovementOccurrenceStatus,
  val ledgerTransactionId: String?,
  val errorCode: String?,
  val errorMessage: String?,
  val createdAt: Instant,
  val updatedAt: Instant,
  val acknowledgedAt: Instant?,
) {
  init {
    require(ledgerTransactionId.isNullOrBlank() || ledgerTransactionId.isNotBlank()) {
      "ledgerTransactionId cannot be blank"
    }
  }
}
