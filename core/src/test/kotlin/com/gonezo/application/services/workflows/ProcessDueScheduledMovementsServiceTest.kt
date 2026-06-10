package com.gonezo.application.services.workflows

import com.gonezo.application.orchestration.AutomaticDueScheduledMovementHandler
import com.gonezo.application.orchestration.ConfirmationRequiredDueScheduledMovementHandler
import com.gonezo.application.orchestration.ProcessDueScheduledMovementsCommand
import com.gonezo.application.orchestration.ProcessDueScheduledMovementsService
import com.gonezo.domain.shared.Money
import com.gonezo.expected.application.CreateExpectedMovementService
import com.gonezo.expected.domain.ExpectedMovement
import com.gonezo.expected.domain.ExpectedMovementId
import com.gonezo.expected.domain.ExpectedMovementStatus
import com.gonezo.expected.domain.ports.ExpectedMovementRepository
import com.gonezo.ledger.application.RecordLedgerExpenseCommand
import com.gonezo.ledger.application.RecordLedgerExpenseUC
import com.gonezo.ledger.application.RecordLedgerIncomeCommand
import com.gonezo.ledger.application.RecordLedgerIncomeUC
import com.gonezo.ledger.application.RecordLedgerTransferCommand
import com.gonezo.ledger.application.RecordLedgerTransferFxCommand
import com.gonezo.ledger.application.RecordLedgerTransferFxUC
import com.gonezo.ledger.application.RecordLedgerTransferResult
import com.gonezo.ledger.application.RecordLedgerTransferUC
import com.gonezo.ledger.domain.TransactionId
import com.gonezo.recurrence.domain.RecurrenceEnd
import com.gonezo.recurrence.domain.RecurrenceFrequency
import com.gonezo.recurrence.domain.RecurrenceRule
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementOccurrence
import com.gonezo.recurrence.domain.RecurringMovementOccurrenceStatus
import com.gonezo.recurrence.domain.RecurringMovementReviewPolicy
import com.gonezo.recurrence.domain.RecurringMovementStatus
import com.gonezo.recurrence.domain.RecurringMovementType
import com.gonezo.recurrence.domain.ports.RecurringMovementOccurrenceRepository
import com.gonezo.recurrence.domain.ports.RecurringMovementRepository
import com.gonezo.recurrence.domain.services.RecurrenceScheduleCalculator
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

class ProcessDueScheduledMovementsServiceTest {
  private val scheduleCalculator = RecurrenceScheduleCalculator()

  @Test
  fun `due automatic expense posts ledger acknowledges occurrence and advances schedule`() {
    val movementRepository = InMemoryRecurringMovementRepository()
    val occurrenceRepository = InMemoryOccurrenceRepository()
    val ledgerExpense = CapturingRecordLedgerExpenseUC("7a00d881-c1fd-4a69-ad8f-2ace38d84c0a")
    val service = service(
      movementRepository = movementRepository,
      occurrenceRepository = occurrenceRepository,
      recordLedgerExpenseUC = ledgerExpense,
    )
    val movement = sampleMovement(
      type = RecurringMovementType.EXPENSE,
      reviewPolicy = RecurringMovementReviewPolicy.AUTOMATIC,
      recurrenceEnd = RecurrenceEnd.Never,
    )
    movementRepository.save(movement)

    val result = service.execute(
      ProcessDueScheduledMovementsCommand(
        now = Instant.parse("2026-06-10T10:00:00Z"),
      ),
    )

    val updated = movementRepository.findById(movement.id)
    val occurrence = occurrenceRepository.listByRecurringMovement(movement.id).single()

    assertThat(result.scanned).isEqualTo(1)
    assertThat(result.posted).isEqualTo(1)
    assertThat(result.expectedCreated).isEqualTo(0)
    assertThat(result.failed).isEqualTo(0)
    assertThat(ledgerExpense.commands.single().occurredAt).isEqualTo(Instant.parse("2026-06-10T09:00:00Z"))
    assertThat(occurrence.status).isEqualTo(RecurringMovementOccurrenceStatus.POSTED)
    assertThat(occurrence.ledgerTransactionId).isEqualTo("7a00d881-c1fd-4a69-ad8f-2ace38d84c0a")
    assertThat(updated!!.status).isEqualTo(RecurringMovementStatus.ACTIVE)
    assertThat(updated.nextDueAt).isEqualTo(Instant.parse("2026-06-11T09:00:00Z"))
  }

  @Test
  fun `due automatic one shot expense completes after posting`() {
    val movementRepository = InMemoryRecurringMovementRepository()
    val occurrenceRepository = InMemoryOccurrenceRepository()
    val service = service(
      movementRepository = movementRepository,
      occurrenceRepository = occurrenceRepository,
      recordLedgerExpenseUC = CapturingRecordLedgerExpenseUC("7a00d881-c1fd-4a69-ad8f-2ace38d84c0a"),
    )
    val movement = sampleMovement(
      type = RecurringMovementType.EXPENSE,
      reviewPolicy = RecurringMovementReviewPolicy.AUTOMATIC,
      recurrenceEnd = RecurrenceEnd.AfterOccurrences(1),
    )
    movementRepository.save(movement)

    service.execute(ProcessDueScheduledMovementsCommand(now = Instant.parse("2026-06-10T10:00:00Z")))

    val updated = movementRepository.findById(movement.id)
    assertThat(updated!!.status).isEqualTo(RecurringMovementStatus.COMPLETED)
    assertThat(updated.nextDueAt).isNull()
    assertThat(updated.generatedOccurrences).isEqualTo(1)
  }

  @Test
  fun `due confirmation required expense creates expected and does not post ledger`() {
    val movementRepository = InMemoryRecurringMovementRepository()
    val occurrenceRepository = InMemoryOccurrenceRepository()
    val expectedRepository = InMemoryExpectedMovementRepository()
    val ledgerExpense = CapturingRecordLedgerExpenseUC("7a00d881-c1fd-4a69-ad8f-2ace38d84c0a")
    val service = service(
      movementRepository = movementRepository,
      occurrenceRepository = occurrenceRepository,
      expectedRepository = expectedRepository,
      recordLedgerExpenseUC = ledgerExpense,
    )
    val movement = sampleMovement(
      type = RecurringMovementType.EXPENSE,
      reviewPolicy = RecurringMovementReviewPolicy.REQUIRE_USER_CONFIRMATION,
      recurrenceEnd = RecurrenceEnd.Never,
    )
    movementRepository.save(movement)

    val result = service.execute(ProcessDueScheduledMovementsCommand(now = Instant.parse("2026-06-10T10:00:00Z")))

    val expected = expectedRepository.storage.values.single()
    val occurrence = occurrenceRepository.listByRecurringMovement(movement.id).single()

    assertThat(result.posted).isEqualTo(0)
    assertThat(result.expectedCreated).isEqualTo(1)
    assertThat(ledgerExpense.commands).isEmpty()
    assertThat(expected.status).isEqualTo(ExpectedMovementStatus.PENDING)
    assertThat(expected.expectedAt).isEqualTo(Instant.parse("2026-06-10T09:00:00Z"))
    assertThat(expected.originOccurrenceId).isEqualTo(occurrence.id.toString())
    assertThat(expected.originRecurringMovementId).isEqualTo(movement.id.toString())
  }

  private fun service(
    movementRepository: InMemoryRecurringMovementRepository,
    occurrenceRepository: InMemoryOccurrenceRepository,
    expectedRepository: InMemoryExpectedMovementRepository = InMemoryExpectedMovementRepository(),
    recordLedgerExpenseUC: RecordLedgerExpenseUC = CapturingRecordLedgerExpenseUC("7a00d881-c1fd-4a69-ad8f-2ace38d84c0a"),
  ): ProcessDueScheduledMovementsService = ProcessDueScheduledMovementsService(
    recurringMovementRepository = movementRepository,
    occurrenceRepository = occurrenceRepository,
    handlers = listOf(
      AutomaticDueScheduledMovementHandler(
        recordLedgerIncomeUC = CapturingRecordLedgerIncomeUC("2ebe1dc1-fad0-4a77-a1e4-e682bd1760fb"),
        recordLedgerExpenseUC = recordLedgerExpenseUC,
        recordLedgerTransferUC = NoopRecordLedgerTransferUC(),
        recordLedgerTransferFxUC = NoopRecordLedgerTransferFxUC(),
      ),
      ConfirmationRequiredDueScheduledMovementHandler(
        createExpectedMovementUC = CreateExpectedMovementService(expectedRepository),
      ),
    ),
    scheduleCalculator = scheduleCalculator,
  )

  private fun sampleMovement(
    type: RecurringMovementType,
    reviewPolicy: RecurringMovementReviewPolicy,
    recurrenceEnd: RecurrenceEnd,
  ): RecurringMovement = RecurringMovement.create(
    id = RecurringMovementId.random(),
    type = type,
    sourceAccountId = UUID.randomUUID().toString(),
    targetAccountId = null,
    amount = BigDecimal("12.34"),
    currency = "USD",
    destinationAmount = null,
    destinationCurrency = null,
    exchangeRate = null,
    description = "Coffee",
    merchant = "Cafe",
    categoryId = "cat-food",
    reviewPolicy = reviewPolicy,
    rule = RecurrenceRule(frequency = RecurrenceFrequency.DAILY),
    recurrenceEnd = recurrenceEnd,
    startAt = Instant.parse("2026-06-10T09:00:00Z"),
    zoneId = "UTC",
    createdAt = Instant.parse("2026-06-09T08:00:00Z"),
    scheduleCalculator = scheduleCalculator,
  )

  private class InMemoryRecurringMovementRepository : RecurringMovementRepository {
    private val storage = ConcurrentHashMap<RecurringMovementId, RecurringMovement>()

    override fun save(movement: RecurringMovement) {
      storage[movement.id] = movement
    }

    override fun findById(id: RecurringMovementId): RecurringMovement? = storage[id]

    override fun findDue(now: Instant, limit: Int): List<RecurringMovement> = storage.values
      .filter { it.status == RecurringMovementStatus.ACTIVE && it.nextDueAt != null && !it.nextDueAt.isAfter(now) }
      .sortedBy { it.nextDueAt }
      .take(limit)

    override fun listBySourceAccount(accountId: String): List<RecurringMovement> = storage.values
      .filter { it.sourceAccountId == accountId }
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

  private class InMemoryExpectedMovementRepository : ExpectedMovementRepository {
    val storage = ConcurrentHashMap<ExpectedMovementId, ExpectedMovement>()

    override fun save(movement: ExpectedMovement) {
      storage[movement.id] = movement
    }

    override fun findById(id: ExpectedMovementId): ExpectedMovement? = storage[id]

    override fun findByOriginOccurrenceId(originOccurrenceId: String): ExpectedMovement? = storage.values.firstOrNull {
      it.originOccurrenceId == originOccurrenceId
    }

    override fun listByAccount(accountId: String, includeClosed: Boolean): List<ExpectedMovement> = storage.values
      .filter { it.accountId == accountId }
  }

  private class CapturingRecordLedgerExpenseUC(private val transactionId: String) : RecordLedgerExpenseUC {
    val commands = mutableListOf<RecordLedgerExpenseCommand>()

    override fun execute(command: RecordLedgerExpenseCommand): TransactionId {
      commands.add(command)
      return TransactionId.from(transactionId)
    }
  }

  private class CapturingRecordLedgerIncomeUC(private val transactionId: String) : RecordLedgerIncomeUC {
    override fun execute(command: RecordLedgerIncomeCommand): TransactionId = TransactionId.from(transactionId)
  }

  private class NoopRecordLedgerTransferUC : RecordLedgerTransferUC {
    override fun execute(command: RecordLedgerTransferCommand): RecordLedgerTransferResult =
      RecordLedgerTransferResult(
        transferOutId = TransactionId.random(),
        transferInId = TransactionId.random(),
      )
  }

  private class NoopRecordLedgerTransferFxUC : RecordLedgerTransferFxUC {
    override fun execute(command: RecordLedgerTransferFxCommand): RecordLedgerTransferResult =
      RecordLedgerTransferResult(
        transferOutId = TransactionId.random(),
        transferInId = TransactionId.random(),
      )
  }
}
