package com.gonezo.application.services.workflows

import com.gonezo.application.orchestration.ApproveRecurringExpectedMovementCommand
import com.gonezo.application.orchestration.ApproveRecurringExpectedMovementService
import com.gonezo.application.orchestration.DismissRecurringExpectedMovementCommand
import com.gonezo.application.orchestration.DismissRecurringExpectedMovementService
import com.gonezo.application.orchestration.HandleRecurringMovementDueForExpectedCommand
import com.gonezo.application.orchestration.HandleRecurringMovementDueForExpectedService
import com.gonezo.expected.application.CreateExpectedMovementService
import com.gonezo.expected.application.DismissExpectedMovementService
import com.gonezo.expected.application.ResolveExpectedMovementService
import com.gonezo.expected.domain.ExpectedMovement
import com.gonezo.expected.domain.ExpectedMovementId
import com.gonezo.expected.domain.ExpectedMovementStatus
import com.gonezo.expected.domain.ports.ExpectedMovementRepository
import com.gonezo.ledger.application.RecordLedgerExpenseCommand
import com.gonezo.ledger.application.RecordLedgerExpenseUC
import com.gonezo.ledger.application.RecordLedgerIncomeCommand
import com.gonezo.ledger.application.RecordLedgerIncomeUC
import com.gonezo.ledger.domain.TransactionId
import com.gonezo.recurrence.application.AcknowledgeRecurringMovementOccurrenceCommand
import com.gonezo.recurrence.application.AcknowledgeRecurringMovementOccurrenceService
import com.gonezo.recurrence.application.AcknowledgeRecurringMovementOccurrenceStatus
import com.gonezo.recurrence.application.RecurringMovementDueIntegrationEvent
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementOccurrence
import com.gonezo.recurrence.domain.RecurringMovementOccurrenceStatus
import com.gonezo.recurrence.domain.ports.RecurringMovementOccurrenceRepository
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

class RecurringExpectedOrchestrationServiceTest {
  @Test
  fun `due recurring event creates pending expected movement`() {
    val expectedRepository = InMemoryExpectedMovementRepository()
    val service = HandleRecurringMovementDueForExpectedService(
      createExpectedMovementUC = CreateExpectedMovementService(expectedRepository),
      expectedMovementRepository = expectedRepository,
    )
    val event = recurringDueEvent(
      occurrenceId = UUID.randomUUID().toString(),
      movementType = "expense",
      amount = "27.50",
      currency = "USD",
      categoryId = "cat-rent",
    )

    val result = service.execute(
      HandleRecurringMovementDueForExpectedCommand(
        event = event,
        handledAt = Instant.parse("2026-06-10T09:01:00Z"),
      ),
    )

    val stored = expectedRepository.findById(result.expectedMovementId)
    assertThat(result.created).isTrue()
    assertThat(stored).isNotNull
    assertThat(stored!!.status).isEqualTo(ExpectedMovementStatus.PENDING)
    assertThat(stored.expectedAt).isEqualTo(Instant.parse(event.dueAt))
    assertThat(stored.originOccurrenceId).isEqualTo(event.occurrenceId)
    assertThat(stored.originRecurringMovementId).isEqualTo(event.recurringMovementId)
    assertThat(stored.categoryId).isEqualTo("cat-rent")
  }

  @Test
  fun `due recurring event is idempotent by occurrence id`() {
    val expectedRepository = InMemoryExpectedMovementRepository()
    val service = HandleRecurringMovementDueForExpectedService(
      createExpectedMovementUC = CreateExpectedMovementService(expectedRepository),
      expectedMovementRepository = expectedRepository,
    )
    val occurrenceId = UUID.randomUUID().toString()
    val event = recurringDueEvent(occurrenceId = occurrenceId)

    val first = service.execute(
      HandleRecurringMovementDueForExpectedCommand(
        event = event,
        handledAt = Instant.parse("2026-06-10T09:01:00Z"),
      ),
    )
    val second = service.execute(
      HandleRecurringMovementDueForExpectedCommand(
        event = event,
        handledAt = Instant.parse("2026-06-10T09:02:00Z"),
      ),
    )

    assertThat(first.created).isTrue()
    assertThat(second.created).isFalse()
    assertThat(second.expectedMovementId).isEqualTo(first.expectedMovementId)
    assertThat(expectedRepository.storage).hasSize(1)
  }

  @Test
  fun `automatic recurring event is not projected as expected`() {
    val expectedRepository = InMemoryExpectedMovementRepository()
    val service = HandleRecurringMovementDueForExpectedService(
      createExpectedMovementUC = CreateExpectedMovementService(expectedRepository),
      expectedMovementRepository = expectedRepository,
    )
    val event = recurringDueEvent(occurrenceId = UUID.randomUUID().toString()).copy(
      reviewPolicy = "automatic",
    )

    assertThatThrownBy {
      service.execute(
        HandleRecurringMovementDueForExpectedCommand(
          event = event,
          handledAt = Instant.parse("2026-06-10T09:01:00Z"),
        ),
      )
    }
      .isInstanceOf(IllegalArgumentException::class.java)
      .hasMessageContaining("does not require expected confirmation")

    assertThat(expectedRepository.storage).isEmpty()
  }

  @Test
  fun `approving expected created from recurrence posts ledger resolves expected and acknowledges occurrence`() {
    val expectedRepository = InMemoryExpectedMovementRepository()
    val occurrenceRepository = InMemoryOccurrenceRepository()
    val occurrenceAcknowledge = AcknowledgeRecurringMovementOccurrenceService(occurrenceRepository)

    val expected = ExpectedMovement.create(
      id = ExpectedMovementId.random(),
      accountId = UUID.randomUUID().toString(),
      type = com.gonezo.expected.domain.ExpectedMovementType.EXPENSE,
      amount = BigDecimal("19.99"),
      currency = "USD",
      expectedAt = Instant.parse("2026-06-10T09:00:00Z"),
      description = "Gym",
      merchant = "Gym",
      categoryId = null,
      createdAt = Instant.parse("2026-06-10T09:00:00Z"),
      originOccurrenceId = UUID.randomUUID().toString(),
    )
    expectedRepository.save(expected)
    val occurrence = RecurringMovementOccurrence.pending(
      id = UUID.fromString(expected.originOccurrenceId),
      recurringMovementId = RecurringMovementId.random(),
      dueAt = Instant.parse("2026-06-10T09:00:00Z"),
      createdAt = Instant.parse("2026-06-10T09:00:01Z"),
    )
    occurrenceRepository.save(occurrence)

    val service = ApproveRecurringExpectedMovementService(
      expectedMovementRepository = expectedRepository,
      recordLedgerIncomeUC = NoopRecordLedgerIncomeUC(),
      recordLedgerExpenseUC = FixedRecordLedgerExpenseUC("f13a95e7-4ff8-4127-be8b-ee6fbf1a6cc5"),
      resolveExpectedMovementUC = ResolveExpectedMovementService(expectedRepository),
      acknowledgeOccurrenceUC = occurrenceAcknowledge,
    )

    val result = service.execute(
      ApproveRecurringExpectedMovementCommand(
        expectedMovementId = expected.id,
        approvedAt = Instant.parse("2026-06-10T09:03:00Z"),
      ),
    )

    val resolved = expectedRepository.findById(expected.id)
    val acknowledged = occurrenceRepository.findById(occurrence.id)

    assertThat(result.transactionId).isEqualTo("f13a95e7-4ff8-4127-be8b-ee6fbf1a6cc5")
    assertThat(resolved!!.status).isEqualTo(ExpectedMovementStatus.RESOLVED)
    assertThat(resolved.resolvedTransactionId).isEqualTo("f13a95e7-4ff8-4127-be8b-ee6fbf1a6cc5")
    assertThat(acknowledged!!.status).isEqualTo(RecurringMovementOccurrenceStatus.POSTED)
    assertThat(acknowledged.ledgerTransactionId).isEqualTo("f13a95e7-4ff8-4127-be8b-ee6fbf1a6cc5")
  }

  @Test
  fun `approval failure keeps expected pending and marks occurrence as failed`() {
    val expectedRepository = InMemoryExpectedMovementRepository()
    val occurrenceRepository = InMemoryOccurrenceRepository()
    val occurrenceAcknowledge = AcknowledgeRecurringMovementOccurrenceService(occurrenceRepository)

    val expected = ExpectedMovement.create(
      id = ExpectedMovementId.random(),
      accountId = UUID.randomUUID().toString(),
      type = com.gonezo.expected.domain.ExpectedMovementType.INCOME,
      amount = BigDecimal("120.00"),
      currency = "USD",
      expectedAt = Instant.parse("2026-06-10T09:00:00Z"),
      description = "Salary",
      merchant = "Employer",
      categoryId = null,
      createdAt = Instant.parse("2026-06-10T09:00:00Z"),
      originOccurrenceId = UUID.randomUUID().toString(),
    )
    expectedRepository.save(expected)
    val occurrence = RecurringMovementOccurrence.pending(
      id = UUID.fromString(expected.originOccurrenceId),
      recurringMovementId = RecurringMovementId.random(),
      dueAt = Instant.parse("2026-06-10T09:00:00Z"),
      createdAt = Instant.parse("2026-06-10T09:00:01Z"),
    )
    occurrenceRepository.save(occurrence)

    val service = ApproveRecurringExpectedMovementService(
      expectedMovementRepository = expectedRepository,
      recordLedgerIncomeUC = ThrowingRecordLedgerIncomeUC("account archived"),
      recordLedgerExpenseUC = FixedRecordLedgerExpenseUC("tx-unused"),
      resolveExpectedMovementUC = ResolveExpectedMovementService(expectedRepository),
      acknowledgeOccurrenceUC = occurrenceAcknowledge,
    )

    assertThatThrownBy {
      service.execute(
        ApproveRecurringExpectedMovementCommand(
          expectedMovementId = expected.id,
          approvedAt = Instant.parse("2026-06-10T09:03:00Z"),
        ),
      )
    }
      .isInstanceOf(IllegalStateException::class.java)
      .hasMessageContaining("account archived")

    val stillPending = expectedRepository.findById(expected.id)
    val failedOccurrence = occurrenceRepository.findById(occurrence.id)
    assertThat(stillPending!!.status).isEqualTo(ExpectedMovementStatus.PENDING)
    assertThat(failedOccurrence!!.status).isEqualTo(RecurringMovementOccurrenceStatus.FAILED)
    assertThat(failedOccurrence.errorCode).isEqualTo("LEDGER_POST_FAILED")
  }

  @Test
  fun `dismiss expected created from recurrence dismisses expected and acknowledges occurrence failure as user dismissed`() {
    val expectedRepository = InMemoryExpectedMovementRepository()
    val occurrenceRepository = InMemoryOccurrenceRepository()
    val occurrenceAcknowledge = AcknowledgeRecurringMovementOccurrenceService(occurrenceRepository)

    val expected = ExpectedMovement.create(
      id = ExpectedMovementId.random(),
      accountId = UUID.randomUUID().toString(),
      type = com.gonezo.expected.domain.ExpectedMovementType.EXPENSE,
      amount = BigDecimal("42.00"),
      currency = "USD",
      expectedAt = Instant.parse("2026-06-10T09:00:00Z"),
      description = "Insurance",
      merchant = "Insurer",
      categoryId = null,
      createdAt = Instant.parse("2026-06-10T09:00:00Z"),
      originOccurrenceId = UUID.randomUUID().toString(),
    )
    expectedRepository.save(expected)
    val occurrence = RecurringMovementOccurrence.pending(
      id = UUID.fromString(expected.originOccurrenceId),
      recurringMovementId = RecurringMovementId.random(),
      dueAt = Instant.parse("2026-06-10T09:00:00Z"),
      createdAt = Instant.parse("2026-06-10T09:00:01Z"),
    )
    occurrenceRepository.save(occurrence)

    val service = DismissRecurringExpectedMovementService(
      expectedMovementRepository = expectedRepository,
      dismissExpectedMovementUC = DismissExpectedMovementService(expectedRepository),
      acknowledgeOccurrenceUC = occurrenceAcknowledge,
    )

    service.execute(
      DismissRecurringExpectedMovementCommand(
        expectedMovementId = expected.id,
        dismissedAt = Instant.parse("2026-06-10T09:05:00Z"),
      ),
    )

    val dismissed = expectedRepository.findById(expected.id)
    val failedOccurrence = occurrenceRepository.findById(occurrence.id)

    assertThat(dismissed!!.status).isEqualTo(ExpectedMovementStatus.DISMISSED)
    assertThat(failedOccurrence!!.status).isEqualTo(RecurringMovementOccurrenceStatus.FAILED)
    assertThat(failedOccurrence.errorCode).isEqualTo("USER_DISMISSED")
  }

  @Test
  fun `due recurring transfer event is rejected for expected movement projection`() {
    val expectedRepository = InMemoryExpectedMovementRepository()
    val service = HandleRecurringMovementDueForExpectedService(
      createExpectedMovementUC = CreateExpectedMovementService(expectedRepository),
      expectedMovementRepository = expectedRepository,
    )
    val transferEvent = recurringDueEvent(
      occurrenceId = UUID.randomUUID().toString(),
      movementType = "transfer",
    )

    assertThatThrownBy {
      service.execute(
        HandleRecurringMovementDueForExpectedCommand(
          event = transferEvent,
          handledAt = Instant.parse("2026-06-10T09:01:00Z"),
        ),
      )
    }
      .isInstanceOf(IllegalArgumentException::class.java)
      .hasMessageContaining("Unsupported recurring movement type")

    assertThat(expectedRepository.storage).isEmpty()
  }

  private fun recurringDueEvent(
    occurrenceId: String,
    movementType: String = "expense",
    amount: String = "10.00",
    currency: String = "USD",
    categoryId: String? = null,
  ): RecurringMovementDueIntegrationEvent = RecurringMovementDueIntegrationEvent(
    eventId = UUID.randomUUID(),
    recurringMovementId = UUID.randomUUID().toString(),
    occurrenceId = occurrenceId,
    dueAt = "2026-06-10T09:00:00Z",
    movementType = movementType,
    sourceAccountId = UUID.randomUUID().toString(),
    targetAccountId = null,
    amount = amount,
    currency = currency,
    destinationAmount = null,
    destinationCurrency = null,
    exchangeRate = null,
    description = "Recurring",
    merchant = "Merchant",
      categoryId = categoryId,
      reviewPolicy = "require_user_confirmation",
  )

  private class InMemoryExpectedMovementRepository : ExpectedMovementRepository {
    val storage = linkedMapOf<ExpectedMovementId, ExpectedMovement>()

    override fun save(movement: ExpectedMovement) {
      storage[movement.id] = movement
    }

    override fun findById(id: ExpectedMovementId): ExpectedMovement? = storage[id]

    override fun listByAccount(accountId: String, includeClosed: Boolean): List<ExpectedMovement> = storage.values
      .filter { it.accountId == accountId }
      .filter { includeClosed || it.status == ExpectedMovementStatus.PENDING }
      .sortedWith(compareBy<ExpectedMovement> { it.expectedAt }.thenBy { it.id.toString() })

    override fun findByOriginOccurrenceId(originOccurrenceId: String): ExpectedMovement? = storage.values
      .firstOrNull { it.originOccurrenceId == originOccurrenceId }
  }

  private class InMemoryOccurrenceRepository : RecurringMovementOccurrenceRepository {
    private val storage = ConcurrentHashMap<UUID, RecurringMovementOccurrence>()

    override fun save(occurrence: RecurringMovementOccurrence) {
      storage[occurrence.id] = occurrence
    }

    override fun findById(id: UUID): RecurringMovementOccurrence? = storage[id]

    override fun findByRecurringMovementAndDueAt(
      recurringMovementId: RecurringMovementId,
      dueAt: Instant,
    ): RecurringMovementOccurrence? = storage.values.firstOrNull {
      it.recurringMovementId == recurringMovementId && it.dueAt == dueAt
    }

    override fun listByRecurringMovement(recurringMovementId: RecurringMovementId): List<RecurringMovementOccurrence> =
      storage.values.filter { it.recurringMovementId == recurringMovementId }
  }

  private class FixedRecordLedgerExpenseUC(
    private val txId: String,
  ) : RecordLedgerExpenseUC {
    override fun execute(command: RecordLedgerExpenseCommand): TransactionId = TransactionId.from(txId)
  }

  private class NoopRecordLedgerIncomeUC : RecordLedgerIncomeUC {
    override fun execute(command: RecordLedgerIncomeCommand): TransactionId = TransactionId.random()
  }

  private class ThrowingRecordLedgerIncomeUC(
    private val message: String,
  ) : RecordLedgerIncomeUC {
    override fun execute(command: RecordLedgerIncomeCommand): TransactionId {
      throw IllegalStateException(message)
    }
  }
}
