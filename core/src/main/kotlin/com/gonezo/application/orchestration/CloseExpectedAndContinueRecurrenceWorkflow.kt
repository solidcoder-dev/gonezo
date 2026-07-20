package com.gonezo.application.orchestration

import com.gonezo.expected.application.CreateExpectedMovementCommand
import com.gonezo.expected.application.CreateExpectedMovementUC
import com.gonezo.expected.domain.ExpectedMovementId
import com.gonezo.expected.domain.ExpectedMovementStatus
import com.gonezo.expected.domain.ports.ExpectedMovementRepository
import com.gonezo.sharing.application.ExpectedOccurrenceShareSnapshot
import com.gonezo.sharing.application.NoOpPlannedShareInstantiator
import com.gonezo.sharing.application.PlannedShareInstantiator
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementOccurrence
import com.gonezo.recurrence.domain.ports.RecurringMovementOccurrenceRepository
import com.gonezo.recurrence.domain.ports.RecurringMovementRepository
import com.gonezo.recurrence.domain.services.RecurrenceScheduleCalculator
import java.time.Instant
import java.util.UUID

interface ExpectedOccurrenceProjectionService {
  fun projectNext(recurringMovementId: String, projectedAt: Instant): ExpectedMovementId?
}

class DefaultExpectedOccurrenceProjectionService(
  private val recurringMovementRepository: RecurringMovementRepository,
  private val occurrenceRepository: RecurringMovementOccurrenceRepository,
  private val expectedMovementRepository: ExpectedMovementRepository,
  private val createExpectedMovementUC: CreateExpectedMovementUC,
  private val expectedOccurrenceFactory: ExpectedOccurrenceFactory = DefaultExpectedOccurrenceFactory(),
  private val scheduleCalculator: RecurrenceScheduleCalculator = RecurrenceScheduleCalculator(),
  private val plannedShareInstantiator: PlannedShareInstantiator = NoOpPlannedShareInstantiator,
) : ExpectedOccurrenceProjectionService {
  override fun projectNext(recurringMovementId: String, projectedAt: Instant): ExpectedMovementId? {
    val movement = recurringMovementRepository.findById(com.gonezo.recurrence.domain.RecurringMovementId.from(recurringMovementId))
      ?: return null
    if (!movement.requiresExpectedConfirmation()) return null

    val dueAt = movement.nextDueAt ?: return null
    val occurrence = occurrenceRepository.findByRecurringMovementAndDueAt(movement.id, dueAt)
      ?: RecurringMovementOccurrence.pending(UUID.randomUUID(), movement.id, dueAt, projectedAt)
        .also(occurrenceRepository::save)
    val existingExpected = expectedMovementRepository.findByOriginOccurrenceId(occurrence.id.toString())
    val expectedId = existingExpected?.id ?: run {
      val draft = expectedOccurrenceFactory.create(
        RecurringOccurrenceSnapshot(
          recurringMovementId = movement.id.toString(),
          occurrenceId = occurrence.id.toString(),
          accountId = movement.sourceAccountId,
          movementType = movement.type.value,
          amount = movement.amount,
          currency = movement.currency,
          dueAt = dueAt,
          description = movement.description,
          merchant = movement.merchant,
          categoryId = movement.categoryId,
          createdAt = projectedAt,
          items = movement.splitItems.map { RecurringOccurrenceSnapshot.Item(it.id, it.name, it.amount) },
          tagNames = movement.tagNames,
        ),
      )
      createExpectedMovementUC.execute(
        CreateExpectedMovementCommand(
          accountId = draft.accountId,
          type = draft.type.value,
          amount = draft.amount,
          currency = draft.currency,
          expectedAt = draft.expectedAt,
          description = draft.description,
          merchant = draft.merchant,
          categoryId = draft.categoryId,
          originOccurrenceId = draft.originOccurrenceId,
          originRecurringMovementId = draft.originRecurringMovementId,
          splitItems = draft.splitItems,
          createdAt = draft.createdAt,
          tagNames = draft.tagNames,
        ),
      )
    }
    plannedShareInstantiator.instantiate(
      ExpectedOccurrenceShareSnapshot(
        expectedMovementId = expectedId.toString(),
        recurringMovementId = movement.id.toString(),
        totalAmount = movement.amount,
        currency = movement.currency,
        createdAt = projectedAt,
      ),
    )
    recurringMovementRepository.save(
      movement.advanceAfterDue(dueAt, projectedAt, scheduleCalculator),
    )
    return expectedId
  }

  private fun RecurringMovement.requiresExpectedConfirmation(): Boolean =
    status == com.gonezo.recurrence.domain.RecurringMovementStatus.ACTIVE &&
      reviewPolicy == com.gonezo.recurrence.domain.RecurringMovementReviewPolicy.REQUIRE_USER_CONFIRMATION &&
      type != com.gonezo.recurrence.domain.RecurringMovementType.TRANSFER
}

data class CloseExpectedAndContinueRecurrenceCommand(
  val expectedMovementId: ExpectedMovementId,
  val action: CloseExpectedAction,
  val occurredAt: Instant,
  val transactionId: String? = null,
)

enum class CloseExpectedAction {
  RESOLVE,
  DISMISS,
}

class CloseExpectedAndContinueRecurrenceWorkflow(
  private val expectedMovementRepository: ExpectedMovementRepository,
  private val occurrenceRepository: RecurringMovementOccurrenceRepository,
  private val recurringMovementRepository: RecurringMovementRepository,
  private val expectedOccurrenceProjectionService: ExpectedOccurrenceProjectionService,
  private val consistencyBoundary: com.gonezo.application.ConsistencyBoundary,
) {
  fun execute(command: CloseExpectedAndContinueRecurrenceCommand): ExpectedMovementId? =
    consistencyBoundary.withinConsistencyBoundary {
      val expected = expectedMovementRepository.findById(command.expectedMovementId)
        ?: error("Expected movement not found: ${command.expectedMovementId}")
      if (expected.status != ExpectedMovementStatus.PENDING) {
        return@withinConsistencyBoundary expectedOccurrenceProjectionService.projectNext(
          expected.originRecurringMovementId ?: return@withinConsistencyBoundary null,
          command.occurredAt,
        )
      }
      val occurrenceId = expected.originOccurrenceId?.let(UUID::fromString)
        ?: error("Expected movement is not linked to a recurrence occurrence")
      val occurrence = occurrenceRepository.findById(occurrenceId)
        ?: error("Recurring occurrence not found: $occurrenceId")

      val closed = when (command.action) {
        CloseExpectedAction.RESOLVE -> expected.resolve(
          command.transactionId ?: error("transactionId is required when resolving"),
          command.occurredAt,
        )
        CloseExpectedAction.DISMISS -> expected.dismiss(command.occurredAt)
      }
      expectedMovementRepository.save(closed)
      val acknowledged = when (command.action) {
        CloseExpectedAction.RESOLVE -> occurrence.acknowledgePosted(
          command.transactionId ?: error("transactionId is required when resolving"),
          command.occurredAt,
        )
        CloseExpectedAction.DISMISS -> occurrence.acknowledgeFailed(
          "USER_DISMISSED",
          "Expected movement dismissed by user",
          command.occurredAt,
        )
      }
      occurrenceRepository.save(acknowledged)
      expectedOccurrenceProjectionService.projectNext(
        expected.originRecurringMovementId ?: return@withinConsistencyBoundary null,
        command.occurredAt,
      )
    }
}
