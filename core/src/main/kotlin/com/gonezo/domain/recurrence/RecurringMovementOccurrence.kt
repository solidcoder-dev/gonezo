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
    require(ledgerTransactionId == null || ledgerTransactionId.isNotBlank()) { "ledgerTransactionId cannot be blank" }
  }

  fun acknowledgePosted(ledgerTxId: String, at: Instant): RecurringMovementOccurrence =
    copy(
      status = RecurringMovementOccurrenceStatus.POSTED,
      ledgerTransactionId = ledgerTxId.trim(),
      errorCode = null,
      errorMessage = null,
      updatedAt = at,
      acknowledgedAt = at,
    )

  fun acknowledgeFailed(errorCodeValue: String?, errorMessageValue: String?, at: Instant): RecurringMovementOccurrence =
    copy(
      status = RecurringMovementOccurrenceStatus.FAILED,
      ledgerTransactionId = null,
      errorCode = errorCodeValue?.trim()?.ifBlank { null },
      errorMessage = errorMessageValue?.trim()?.ifBlank { null },
      updatedAt = at,
      acknowledgedAt = at,
    )

  companion object {
    fun pending(
      id: UUID,
      recurringMovementId: RecurringMovementId,
      dueAt: Instant,
      createdAt: Instant,
    ): RecurringMovementOccurrence = RecurringMovementOccurrence(
      id = id,
      recurringMovementId = recurringMovementId,
      dueAt = dueAt,
      status = RecurringMovementOccurrenceStatus.PENDING,
      ledgerTransactionId = null,
      errorCode = null,
      errorMessage = null,
      createdAt = createdAt,
      updatedAt = createdAt,
      acknowledgedAt = null,
    )
  }
}
