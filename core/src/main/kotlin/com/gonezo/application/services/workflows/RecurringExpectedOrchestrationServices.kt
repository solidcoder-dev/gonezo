package com.gonezo.application.orchestration

import com.gonezo.domain.shared.Money
import com.gonezo.expected.application.CreateExpectedMovementCommand
import com.gonezo.expected.application.CreateExpectedMovementUC
import com.gonezo.expected.application.DismissExpectedMovementCommand
import com.gonezo.expected.application.DismissExpectedMovementUC
import com.gonezo.expected.application.ResolveExpectedMovementCommand
import com.gonezo.expected.application.ResolveExpectedMovementUC
import com.gonezo.expected.domain.ExpectedMovement
import com.gonezo.expected.domain.ExpectedMovementStatus
import com.gonezo.expected.domain.ExpectedMovementType
import com.gonezo.expected.domain.ports.ExpectedMovementRepository
import com.gonezo.ledger.application.RecordLedgerExpenseCommand
import com.gonezo.ledger.application.RecordLedgerExpenseUC
import com.gonezo.ledger.application.RecordLedgerIncomeCommand
import com.gonezo.ledger.application.RecordLedgerIncomeUC
import com.gonezo.ledger.domain.AccountId
import com.gonezo.recurrence.application.AcknowledgeRecurringMovementOccurrenceCommand
import com.gonezo.recurrence.application.AcknowledgeRecurringMovementOccurrenceStatus
import com.gonezo.recurrence.application.AcknowledgeRecurringMovementOccurrenceUC
import com.gonezo.recurrence.domain.RecurringMovementReviewPolicy
import com.gonezo.sharing.application.ExpectedOccurrenceShareSnapshot
import com.gonezo.sharing.application.NoOpPlannedShareInstantiator
import com.gonezo.sharing.application.PlannedShareInstantiator
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

class HandleRecurringMovementDueForExpectedService(
  private val createExpectedMovementUC: CreateExpectedMovementUC,
  private val expectedMovementRepository: ExpectedMovementRepository,
  private val expectedOccurrenceFactory: ExpectedOccurrenceFactory = DefaultExpectedOccurrenceFactory(),
  private val plannedShareInstantiator: PlannedShareInstantiator = NoOpPlannedShareInstantiator,
) : HandleRecurringMovementDueForExpectedUC {
  override fun execute(command: HandleRecurringMovementDueForExpectedCommand): HandleRecurringMovementDueForExpectedResult {
    val occurrenceId = command.event.occurrenceId.trim()
    require(occurrenceId.isNotBlank()) { "occurrenceId is required" }
    require(command.event.reviewPolicy == RecurringMovementReviewPolicy.REQUIRE_USER_CONFIRMATION.value) {
      "Recurring movement does not require expected confirmation"
    }

    val existing = expectedMovementRepository.findByOriginOccurrenceId(occurrenceId)
    if (existing != null) {
      plannedShareInstantiator.instantiate(
        ExpectedOccurrenceShareSnapshot(
          expectedMovementId = existing.id.toString(),
          recurringMovementId = command.event.recurringMovementId,
          totalAmount = BigDecimal(command.event.amount),
          currency = command.event.currency,
          createdAt = command.handledAt,
        ),
      )
      return HandleRecurringMovementDueForExpectedResult(
        expectedMovementId = existing.id,
        created = false,
      )
    }

    require(command.event.movementType.trim().lowercase() == ExpectedMovementType.EXPENSE.value ||
      command.event.movementType.trim().lowercase() == ExpectedMovementType.INCOME.value) {
      "Unsupported recurring movement type for expected projection: ${command.event.movementType}"
    }

    val draft = expectedOccurrenceFactory.create(
      RecurringOccurrenceSnapshot(
        recurringMovementId = command.event.recurringMovementId,
        occurrenceId = occurrenceId,
        accountId = command.event.sourceAccountId,
        movementType = command.event.movementType,
        amount = BigDecimal(command.event.amount),
        currency = command.event.currency,
        dueAt = Instant.parse(command.event.dueAt),
        description = command.event.description,
        merchant = command.event.merchant,
          categoryId = command.event.categoryId,
          tagNames = command.event.tagNames,
        createdAt = command.handledAt,
        items = command.event.splitItems.map {
          RecurringOccurrenceSnapshot.Item(
            templateItemId = it.id,
            name = it.name,
            amount = BigDecimal(it.amount),
          )
        },
      ),
    )

    val expectedId = try {
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
    } catch (ex: RuntimeException) {
      val stored = expectedMovementRepository.findByOriginOccurrenceId(occurrenceId)
      if (stored != null) {
        return HandleRecurringMovementDueForExpectedResult(
          expectedMovementId = stored.id,
          created = false,
        )
      }
      throw ex
    }

    plannedShareInstantiator.instantiate(
      ExpectedOccurrenceShareSnapshot(
        expectedMovementId = expectedId.toString(),
        recurringMovementId = command.event.recurringMovementId,
        totalAmount = draft.amount,
        currency = draft.currency,
        createdAt = command.handledAt,
      ),
    )

    return HandleRecurringMovementDueForExpectedResult(
      expectedMovementId = expectedId,
      created = true,
    )
  }
}

class ApproveRecurringExpectedMovementService(
  private val expectedMovementRepository: ExpectedMovementRepository,
  private val recordLedgerIncomeUC: RecordLedgerIncomeUC,
  private val recordLedgerExpenseUC: RecordLedgerExpenseUC,
  private val resolveExpectedMovementUC: ResolveExpectedMovementUC,
  private val acknowledgeOccurrenceUC: AcknowledgeRecurringMovementOccurrenceUC,
) : ApproveRecurringExpectedMovementUC {
  override fun execute(command: ApproveRecurringExpectedMovementCommand): ApproveRecurringExpectedMovementResult {
    val movement = requireExpectedMovement(expectedMovementRepository, command.expectedMovementId)
    check(movement.status == ExpectedMovementStatus.PENDING) {
      "Only pending expected movements can be approved"
    }

    val occurrenceId = movement.originOccurrenceId?.let(UUID::fromString)
      ?: throw IllegalStateException("Expected movement is not linked to a recurrence occurrence")

    val ledgerTransactionId = try {
      postExpectedMovementToLedger(movement)
    } catch (ex: RuntimeException) {
      acknowledgeOccurrenceUC.execute(
        AcknowledgeRecurringMovementOccurrenceCommand(
          occurrenceId = occurrenceId,
          status = AcknowledgeRecurringMovementOccurrenceStatus.FAILED,
          ledgerTransactionId = null,
          errorCode = "LEDGER_POST_FAILED",
          errorMessage = ex.message,
          acknowledgedAt = command.approvedAt,
        ),
      )
      throw ex
    }

    try {
      resolveExpectedMovementUC.execute(
        ResolveExpectedMovementCommand(
          expectedMovementId = movement.id,
          transactionId = ledgerTransactionId,
          resolvedAt = command.approvedAt,
        ),
      )
      acknowledgeOccurrenceUC.execute(
        AcknowledgeRecurringMovementOccurrenceCommand(
          occurrenceId = occurrenceId,
          status = AcknowledgeRecurringMovementOccurrenceStatus.POSTED,
          ledgerTransactionId = ledgerTransactionId,
          errorCode = null,
          errorMessage = null,
          acknowledgedAt = command.approvedAt,
        ),
      )
    } catch (ex: RuntimeException) {
      acknowledgeOccurrenceUC.execute(
        AcknowledgeRecurringMovementOccurrenceCommand(
          occurrenceId = occurrenceId,
          status = AcknowledgeRecurringMovementOccurrenceStatus.FAILED,
          ledgerTransactionId = null,
          errorCode = "EXPECTED_RESOLVE_FAILED",
          errorMessage = ex.message,
          acknowledgedAt = command.approvedAt,
        ),
      )
      throw ex
    }

    return ApproveRecurringExpectedMovementResult(transactionId = ledgerTransactionId)
  }

  private fun postExpectedMovementToLedger(movement: ExpectedMovement): String {
    val accountId = AccountId.from(movement.accountId)
    val amount = Money(movement.amount, movement.currency)

    return when (movement.type) {
      ExpectedMovementType.INCOME -> recordLedgerIncomeUC.execute(
        RecordLedgerIncomeCommand(
          accountId = accountId,
          amount = amount,
          occurredAt = movement.expectedAt,
          description = movement.description,
          merchant = movement.merchant,
        ),
      ).toString()

      ExpectedMovementType.EXPENSE -> recordLedgerExpenseUC.execute(
        RecordLedgerExpenseCommand(
          accountId = accountId,
          amount = amount,
          occurredAt = movement.expectedAt,
          description = movement.description,
          merchant = movement.merchant,
        ),
      ).toString()
    }
  }
}

class DismissRecurringExpectedMovementService(
  private val expectedMovementRepository: ExpectedMovementRepository,
  private val dismissExpectedMovementUC: DismissExpectedMovementUC,
  private val acknowledgeOccurrenceUC: AcknowledgeRecurringMovementOccurrenceUC,
) : DismissRecurringExpectedMovementUC {
  override fun execute(command: DismissRecurringExpectedMovementCommand) {
    val movement = requireExpectedMovement(expectedMovementRepository, command.expectedMovementId)
    check(movement.status == ExpectedMovementStatus.PENDING) {
      "Only pending expected movements can be dismissed"
    }

    val occurrenceId = movement.originOccurrenceId?.let(UUID::fromString)
      ?: throw IllegalStateException("Expected movement is not linked to a recurrence occurrence")

    dismissExpectedMovementUC.execute(
      DismissExpectedMovementCommand(
        expectedMovementId = movement.id,
        dismissedAt = command.dismissedAt,
      ),
    )

    acknowledgeOccurrenceUC.execute(
      AcknowledgeRecurringMovementOccurrenceCommand(
        occurrenceId = occurrenceId,
        status = AcknowledgeRecurringMovementOccurrenceStatus.FAILED,
        ledgerTransactionId = null,
        errorCode = "USER_DISMISSED",
        errorMessage = "Expected movement dismissed by user",
        acknowledgedAt = command.dismissedAt,
      ),
    )
  }
}

private fun requireExpectedMovement(
  repository: ExpectedMovementRepository,
  expectedMovementId: com.gonezo.expected.domain.ExpectedMovementId,
): ExpectedMovement = repository.findById(expectedMovementId)
  ?: throw IllegalStateException("Expected movement not found: $expectedMovementId")
