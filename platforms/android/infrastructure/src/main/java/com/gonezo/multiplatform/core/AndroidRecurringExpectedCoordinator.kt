package com.gonezo.multiplatform.core

import com.gonezo.application.ConsistencyBoundary
import com.gonezo.application.ImmediateConsistencyBoundary
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementReviewPolicy
import com.gonezo.recurrence.domain.RecurringMovementStatus
import com.gonezo.recurrence.domain.RecurringMovementType
import com.gonezo.recurrence.domain.ports.RecurringMovementRepository
import com.gonezo.recurrence.domain.services.RecurrenceScheduleCalculator
import java.time.Clock
import java.time.Instant

internal class AndroidRecurringExpectedCoordinator(
  private val recurringMovementRepository: RecurringMovementRepository,
  private val store: Store,
  private val clock: Clock,
  private val scheduleCalculator: RecurrenceScheduleCalculator = RecurrenceScheduleCalculator(),
  private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary,
) {
  fun projectNext(recurringMovementId: String): String? =
    consistencyBoundary.withinConsistencyBoundary {
      projectNextWithinConsistencyBoundary(RecurringMovementId.from(recurringMovementId))
    }

  fun continueAfterResolution(expectedMovementId: String, transactionId: String, resolvedAt: String) {
    continueAfterExpectedClosed(
      expectedMovementId = expectedMovementId,
      status = "posted",
      ledgerTransactionId = transactionId,
      errorCode = null,
      errorMessage = null,
      acknowledgedAt = resolvedAt,
    )
  }

  fun continueAfterDismissal(expectedMovementId: String, dismissedAt: String) {
    continueAfterExpectedClosed(
      expectedMovementId = expectedMovementId,
      status = "failed",
      ledgerTransactionId = null,
      errorCode = "USER_DISMISSED",
      errorMessage = "Expected movement dismissed by user",
      acknowledgedAt = dismissedAt,
    )
  }

  private fun continueAfterExpectedClosed(
    expectedMovementId: String,
    status: String,
    ledgerTransactionId: String?,
    errorCode: String?,
    errorMessage: String?,
    acknowledgedAt: String,
  ) {
    consistencyBoundary.withinConsistencyBoundary {
      val origin = store.findExpectedOrigin(expectedMovementId) ?: return@withinConsistencyBoundary
      store.acknowledgeOccurrence(
        occurrenceId = origin.occurrenceId,
        status = status,
        ledgerTransactionId = ledgerTransactionId,
        errorCode = errorCode,
        errorMessage = errorMessage,
        acknowledgedAt = acknowledgedAt,
      )
      projectNextWithinConsistencyBoundary(RecurringMovementId.from(origin.recurringMovementId))
    }
  }

  private fun projectNextWithinConsistencyBoundary(recurringMovementId: RecurringMovementId): String? {
    val movement = recurringMovementRepository.findById(recurringMovementId) ?: return null
    if (
      movement.status != RecurringMovementStatus.ACTIVE ||
      movement.reviewPolicy != RecurringMovementReviewPolicy.REQUIRE_USER_CONFIRMATION ||
      movement.type == RecurringMovementType.TRANSFER
    ) {
      return null
    }

    store.findPendingExpectedMovementId(recurringMovementId.toString())?.let { return it }

    val dueAt = checkNotNull(movement.nextDueAt) { "Active recurring movement must have nextDueAt" }
    val createdAt = Instant.now(clock)
    val occurrenceId = store.findOccurrenceId(recurringMovementId.toString(), dueAt.toString())
      ?: store.createPendingOccurrence(
        recurringMovementId = recurringMovementId.toString(),
        dueAt = dueAt.toString(),
        createdAt = createdAt.toString(),
      )
    val expectedMovementId = store.findExpectedMovementId(occurrenceId)
      ?: store.createExpectedMovement(
        movement = movement,
        originOccurrenceId = occurrenceId,
        dueAt = dueAt.toString(),
      )

    recurringMovementRepository.save(
      movement.advanceAfterDue(
        dueAt = dueAt,
        advancedAt = createdAt,
        scheduleCalculator = scheduleCalculator,
      ),
    )
    return expectedMovementId
  }

  data class ExpectedOrigin(
    val occurrenceId: String,
    val recurringMovementId: String,
  )

  interface Store {
    fun findPendingExpectedMovementId(recurringMovementId: String): String?

    fun findOccurrenceId(recurringMovementId: String, dueAt: String): String?

    fun createPendingOccurrence(recurringMovementId: String, dueAt: String, createdAt: String): String

    fun findExpectedMovementId(originOccurrenceId: String): String?

    fun createExpectedMovement(movement: RecurringMovement, originOccurrenceId: String, dueAt: String): String

    fun findExpectedOrigin(expectedMovementId: String): ExpectedOrigin?

    fun acknowledgeOccurrence(
      occurrenceId: String,
      status: String,
      ledgerTransactionId: String?,
      errorCode: String?,
      errorMessage: String?,
      acknowledgedAt: String,
    )
  }
}
