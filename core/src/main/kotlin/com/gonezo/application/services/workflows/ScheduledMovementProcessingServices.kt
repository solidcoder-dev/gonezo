package com.gonezo.application.orchestration

import com.gonezo.application.ConsistencyBoundary
import com.gonezo.application.ImmediateConsistencyBoundary
import com.gonezo.domain.shared.Money
import com.gonezo.expected.application.CreateExpectedMovementCommand
import com.gonezo.expected.application.CreateExpectedMovementUC
import com.gonezo.expected.domain.ExpectedMovement
import com.gonezo.ledger.application.RecordLedgerExpenseCommand
import com.gonezo.ledger.application.RecordLedgerExpenseUC
import com.gonezo.ledger.application.RecordLedgerIncomeCommand
import com.gonezo.ledger.application.RecordLedgerIncomeUC
import com.gonezo.ledger.application.RecordLedgerTransferCommand
import com.gonezo.ledger.application.RecordLedgerTransferFxCommand
import com.gonezo.ledger.application.RecordLedgerTransferFxUC
import com.gonezo.ledger.application.RecordLedgerTransferUC
import com.gonezo.ledger.domain.AccountId
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementOccurrence
import com.gonezo.recurrence.domain.RecurringMovementOccurrenceStatus
import com.gonezo.recurrence.domain.RecurringMovementReviewPolicy
import com.gonezo.recurrence.domain.RecurringMovementType
import com.gonezo.recurrence.domain.ports.RecurringMovementOccurrenceRepository
import com.gonezo.recurrence.domain.ports.RecurringMovementRepository
import com.gonezo.recurrence.domain.services.RecurrenceScheduleCalculator
import java.time.Instant
import java.util.UUID

data class DueScheduledMovementContext(
  val movement: RecurringMovement,
  val occurrence: RecurringMovementOccurrence,
  val handledAt: Instant,
)

sealed class DueScheduledMovementHandlerResult {
  data class Posted(val ledgerTransactionId: String) : DueScheduledMovementHandlerResult()
  data class ExpectedCreated(val expectedMovementId: String) : DueScheduledMovementHandlerResult()
}

interface DueScheduledMovementHandler {
  fun supports(movement: RecurringMovement): Boolean
  fun handle(context: DueScheduledMovementContext): DueScheduledMovementHandlerResult
}

class ProcessDueScheduledMovementsService(
  private val recurringMovementRepository: RecurringMovementRepository,
  private val occurrenceRepository: RecurringMovementOccurrenceRepository,
  private val handlers: List<DueScheduledMovementHandler>,
  private val scheduleCalculator: RecurrenceScheduleCalculator,
  private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary,
) : ProcessDueScheduledMovementsUC {
  override fun execute(command: ProcessDueScheduledMovementsCommand): ProcessDueScheduledMovementsResult {
    require(command.limit > 0) { "limit must be greater than 0" }

    var posted = 0
    var expectedCreated = 0
    var failed = 0
    var advancedSchedules = 0
    val dueMovements = recurringMovementRepository.findDue(command.now, command.limit)

    dueMovements.forEach { movement ->
      val outcome = consistencyBoundary.withinConsistencyBoundary {
        processMovement(movement, command.now)
      }
      when (outcome) {
        ProcessedDueMovementOutcome.POSTED -> posted += 1
        ProcessedDueMovementOutcome.EXPECTED_CREATED -> expectedCreated += 1
        ProcessedDueMovementOutcome.FAILED -> failed += 1
      }
      if (outcome != ProcessedDueMovementOutcome.FAILED) {
        advancedSchedules += 1
      }
    }

    return ProcessDueScheduledMovementsResult(
      scanned = dueMovements.size,
      posted = posted,
      expectedCreated = expectedCreated,
      failed = failed,
      advancedSchedules = advancedSchedules,
    )
  }

  private fun processMovement(
    movement: RecurringMovement,
    handledAt: Instant,
  ): ProcessedDueMovementOutcome {
    val dueAt = checkNotNull(movement.nextDueAt) { "Active recurring movement must have nextDueAt" }
    val existingOccurrence = occurrenceRepository.findByRecurringMovementAndDueAt(movement.id, dueAt)
    if (existingOccurrence?.status == RecurringMovementOccurrenceStatus.POSTED) {
      advanceMovement(movement, dueAt, handledAt)
      return ProcessedDueMovementOutcome.POSTED
    }

    val occurrence = existingOccurrence ?: RecurringMovementOccurrence.pending(
      id = UUID.randomUUID(),
      recurringMovementId = movement.id,
      dueAt = dueAt,
      createdAt = handledAt,
    ).also(occurrenceRepository::save)

    val handler = handlers.firstOrNull { it.supports(movement) }
      ?: throw IllegalStateException("No due scheduled movement handler for ${movement.type.value}/${movement.reviewPolicy.value}")

    return try {
      when (val result = handler.handle(DueScheduledMovementContext(movement, occurrence, handledAt))) {
        is DueScheduledMovementHandlerResult.Posted -> {
          occurrenceRepository.save(occurrence.acknowledgePosted(result.ledgerTransactionId, handledAt))
          advanceMovement(movement, dueAt, handledAt)
          ProcessedDueMovementOutcome.POSTED
        }

        is DueScheduledMovementHandlerResult.ExpectedCreated -> {
          occurrenceRepository.save(occurrence)
          advanceMovement(movement, dueAt, handledAt)
          ProcessedDueMovementOutcome.EXPECTED_CREATED
        }
      }
    } catch (ex: RuntimeException) {
      occurrenceRepository.save(
        occurrence.acknowledgeFailed(
          errorCodeValue = "DUE_SCHEDULED_PROCESSING_FAILED",
          errorMessageValue = ex.message,
          at = handledAt,
        ),
      )
      ProcessedDueMovementOutcome.FAILED
    }
  }

  private fun advanceMovement(movement: RecurringMovement, dueAt: Instant, handledAt: Instant) {
    recurringMovementRepository.save(
      movement.advanceAfterDue(
        dueAt = dueAt,
        advancedAt = handledAt,
        scheduleCalculator = scheduleCalculator,
      ),
    )
  }

  private enum class ProcessedDueMovementOutcome {
    POSTED,
    EXPECTED_CREATED,
    FAILED,
  }
}

class AutomaticDueScheduledMovementHandler(
  private val recordLedgerIncomeUC: RecordLedgerIncomeUC,
  private val recordLedgerExpenseUC: RecordLedgerExpenseUC,
  private val recordLedgerTransferUC: RecordLedgerTransferUC,
  private val recordLedgerTransferFxUC: RecordLedgerTransferFxUC,
) : DueScheduledMovementHandler {
  override fun supports(movement: RecurringMovement): Boolean =
    movement.reviewPolicy == RecurringMovementReviewPolicy.AUTOMATIC

  override fun handle(context: DueScheduledMovementContext): DueScheduledMovementHandlerResult {
    val movement = context.movement
    val transactionId = when (movement.type) {
      RecurringMovementType.INCOME -> recordLedgerIncomeUC.execute(
        RecordLedgerIncomeCommand(
          accountId = AccountId.from(movement.sourceAccountId),
          amount = Money(movement.amount, movement.currency),
          occurredAt = context.occurrence.dueAt,
          description = movement.description,
          merchant = movement.merchant,
        ),
      ).toString()

      RecurringMovementType.EXPENSE -> recordLedgerExpenseUC.execute(
        RecordLedgerExpenseCommand(
          accountId = AccountId.from(movement.sourceAccountId),
          amount = Money(movement.amount, movement.currency),
          occurredAt = context.occurrence.dueAt,
          description = movement.description,
          merchant = movement.merchant,
        ),
      ).toString()

      RecurringMovementType.TRANSFER -> postTransfer(movement, context.occurrence.dueAt)
    }

    return DueScheduledMovementHandlerResult.Posted(transactionId)
  }

  private fun postTransfer(movement: RecurringMovement, dueAt: Instant): String {
    val targetAccountId = movement.targetAccountId
      ?: throw IllegalStateException("targetAccountId is required for scheduled transfer")

    val result = if (movement.destinationAmount != null && movement.destinationCurrency != null) {
      recordLedgerTransferFxUC.execute(
        RecordLedgerTransferFxCommand(
          fromAccountId = AccountId.from(movement.sourceAccountId),
          toAccountId = AccountId.from(targetAccountId),
          sourceAmount = Money(movement.amount, movement.currency),
          destinationAmount = Money(movement.destinationAmount, movement.destinationCurrency),
          occurredAt = dueAt,
          description = movement.description,
          exchangeRate = movement.exchangeRate,
        ),
      )
    } else {
      recordLedgerTransferUC.execute(
        RecordLedgerTransferCommand(
          fromAccountId = AccountId.from(movement.sourceAccountId),
          toAccountId = AccountId.from(targetAccountId),
          amount = Money(movement.amount, movement.currency),
          occurredAt = dueAt,
          description = movement.description,
        ),
      )
    }
    return result.transferOutId.toString()
  }
}

class ConfirmationRequiredDueScheduledMovementHandler(
  private val createExpectedMovementUC: CreateExpectedMovementUC,
) : DueScheduledMovementHandler {
  override fun supports(movement: RecurringMovement): Boolean =
    movement.reviewPolicy == RecurringMovementReviewPolicy.REQUIRE_USER_CONFIRMATION &&
      movement.type != RecurringMovementType.TRANSFER

  override fun handle(context: DueScheduledMovementContext): DueScheduledMovementHandlerResult {
    val movement = context.movement
    val expectedType = when (movement.type) {
      RecurringMovementType.EXPENSE -> "expense"
      RecurringMovementType.INCOME -> "income"
      RecurringMovementType.TRANSFER -> throw IllegalArgumentException("Scheduled transfer cannot be projected as expected")
    }

    val expectedId = createExpectedMovementUC.execute(
      CreateExpectedMovementCommand(
        accountId = movement.sourceAccountId,
        type = expectedType,
        amount = movement.amount,
        currency = movement.currency,
        expectedAt = context.occurrence.dueAt,
        description = movement.description,
        merchant = movement.merchant,
        categoryId = movement.categoryId,
        originOccurrenceId = context.occurrence.id.toString(),
        originRecurringMovementId = movement.id.toString(),
        splitItems = movement.splitItems.map {
          ExpectedMovement.SplitItem(
            id = it.id,
            name = it.name,
            amount = it.amount,
          )
        },
        createdAt = context.handledAt,
      ),
    )
    return DueScheduledMovementHandlerResult.ExpectedCreated(expectedId.toString())
  }
}
