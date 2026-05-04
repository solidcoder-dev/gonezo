package com.gonezo.application.orchestration

import com.gonezo.expected.domain.ExpectedMovementId
import com.gonezo.recurrence.application.RecurringMovementDueIntegrationEvent
import java.time.Instant

data class HandleRecurringMovementDueForExpectedCommand(
  val event: RecurringMovementDueIntegrationEvent,
  val handledAt: Instant,
)

data class HandleRecurringMovementDueForExpectedResult(
  val expectedMovementId: ExpectedMovementId,
  val created: Boolean,
)

interface HandleRecurringMovementDueForExpectedUC {
  fun execute(command: HandleRecurringMovementDueForExpectedCommand): HandleRecurringMovementDueForExpectedResult
}

data class ApproveRecurringExpectedMovementCommand(
  val expectedMovementId: ExpectedMovementId,
  val approvedAt: Instant,
)

data class ApproveRecurringExpectedMovementResult(
  val transactionId: String,
)

interface ApproveRecurringExpectedMovementUC {
  fun execute(command: ApproveRecurringExpectedMovementCommand): ApproveRecurringExpectedMovementResult
}

data class DismissRecurringExpectedMovementCommand(
  val expectedMovementId: ExpectedMovementId,
  val dismissedAt: Instant,
)

interface DismissRecurringExpectedMovementUC {
  fun execute(command: DismissRecurringExpectedMovementCommand)
}
