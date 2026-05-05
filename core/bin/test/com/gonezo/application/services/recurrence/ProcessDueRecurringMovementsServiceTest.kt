package com.gonezo.application.services.recurrence

import com.gonezo.recurrence.application.ProcessDueRecurringMovementsCommand
import com.gonezo.recurrence.application.ProcessDueRecurringMovementsService
import com.gonezo.recurrence.application.RecurringMovementDueIntegrationEvent
import com.gonezo.recurrence.domain.RecurrenceEnd
import com.gonezo.recurrence.domain.RecurrenceOutboxMessage
import com.gonezo.recurrence.domain.RecurrenceOutboxStatus
import com.gonezo.recurrence.domain.RecurrenceRule
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementOccurrence
import com.gonezo.recurrence.domain.RecurringMovementStatus
import com.gonezo.recurrence.domain.RecurringMovementType
import com.gonezo.recurrence.domain.ports.RecurrenceOutboxRepository
import com.gonezo.recurrence.domain.ports.RecurringMovementOccurrenceRepository
import com.gonezo.recurrence.domain.ports.RecurringMovementRepository
import com.gonezo.recurrence.domain.services.RecurrenceScheduleCalculator
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

class ProcessDueRecurringMovementsServiceTest {
  private val scheduleCalculator = RecurrenceScheduleCalculator()

  @Test
  fun `creates pending occurrence and outbox event and advances schedule`() {
    val movementRepository = InMemoryRecurringMovementRepository()
    val occurrenceRepository = InMemoryOccurrenceRepository()
    val outboxRepository = InMemoryOutboxRepository()
    val service = ProcessDueRecurringMovementsService(
      recurringMovementRepository = movementRepository,
      occurrenceRepository = occurrenceRepository,
      outboxRepository = outboxRepository,
      scheduleCalculator = scheduleCalculator,
    )

    val movement = sampleMovement(
      startAt = Instant.parse("2026-04-10T09:00:00Z"),
      createdAt = Instant.parse("2026-04-10T08:00:00Z"),
    )
    movementRepository.save(movement)

    val result = service.execute(
      ProcessDueRecurringMovementsCommand(
        now = Instant.parse("2026-04-10T10:00:00Z"),
        limit = 100,
      ),
    )

    val updated = movementRepository.findById(movement.id)
    val occurrences = occurrenceRepository.listByRecurringMovement(movement.id)
    val outbox = outboxRepository.findPending(limit = 100)

    assertThat(result.scanned).isEqualTo(1)
    assertThat(result.createdOccurrences).isEqualTo(1)
    assertThat(result.advancedSchedules).isEqualTo(1)

    assertThat(updated!!.generatedOccurrences).isEqualTo(1)
    assertThat(updated.nextDueAt).isEqualTo(Instant.parse("2026-04-11T09:00:00Z"))
    assertThat(occurrences).hasSize(1)
    assertThat(outbox).hasSize(1)

    val event = RecurringMovementDueIntegrationEvent.fromJson(outbox.first().payloadJson)
    assertThat(event.recurringMovementId).isEqualTo(movement.id.toString())
    assertThat(event.occurrenceId).isEqualTo(occurrences.first().id.toString())
    assertThat(event.eventId).isNotNull()
    assertThat(event.categoryId).isEqualTo("cat-streaming")
  }

  @Test
  fun `idempotently advances when occurrence for due date already exists`() {
    val movementRepository = InMemoryRecurringMovementRepository()
    val occurrenceRepository = InMemoryOccurrenceRepository()
    val outboxRepository = InMemoryOutboxRepository()
    val service = ProcessDueRecurringMovementsService(
      recurringMovementRepository = movementRepository,
      occurrenceRepository = occurrenceRepository,
      outboxRepository = outboxRepository,
      scheduleCalculator = scheduleCalculator,
    )

    val dueAt = Instant.parse("2026-04-10T09:00:00Z")
    val movement = sampleMovement(
      startAt = dueAt,
      createdAt = Instant.parse("2026-04-10T08:00:00Z"),
    )
    movementRepository.save(movement)
    occurrenceRepository.save(
      RecurringMovementOccurrence.pending(
        id = UUID.randomUUID(),
        recurringMovementId = movement.id,
        dueAt = dueAt,
        createdAt = Instant.parse("2026-04-10T09:00:30Z"),
      ),
    )

    val result = service.execute(
      ProcessDueRecurringMovementsCommand(
        now = Instant.parse("2026-04-10T10:00:00Z"),
        limit = 100,
      ),
    )

    val updated = movementRepository.findById(movement.id)
    val outbox = outboxRepository.findPending(limit = 100)

    assertThat(result.scanned).isEqualTo(1)
    assertThat(result.createdOccurrences).isEqualTo(0)
    assertThat(result.advancedSchedules).isEqualTo(1)
    assertThat(updated!!.nextDueAt).isEqualTo(Instant.parse("2026-04-11T09:00:00Z"))
    assertThat(updated.generatedOccurrences).isEqualTo(1)
    assertThat(outbox).isEmpty()
  }

  private fun sampleMovement(startAt: Instant, createdAt: Instant): RecurringMovement =
    RecurringMovement.create(
      id = RecurringMovementId.random(),
      type = RecurringMovementType.EXPENSE,
      sourceAccountId = "acc-wallet",
      targetAccountId = null,
      amount = BigDecimal("19.99"),
      currency = "USD",
      destinationAmount = null,
      destinationCurrency = null,
      exchangeRate = null,
      description = "Streaming",
      merchant = "Streaming",
      categoryId = "cat-streaming",
      rule = RecurrenceRule(
        frequency = com.gonezo.recurrence.domain.RecurrenceFrequency.DAILY,
        interval = 1,
      ),
      recurrenceEnd = RecurrenceEnd.Never,
      startAt = startAt,
      zoneId = "UTC",
      createdAt = createdAt,
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
      storage.values.filter { it.recurringMovementId == recurringMovementId }.sortedBy { it.dueAt }
  }

  private class InMemoryOutboxRepository : RecurrenceOutboxRepository {
    private val storage = ConcurrentHashMap<UUID, RecurrenceOutboxMessage>()

    override fun save(message: RecurrenceOutboxMessage) {
      storage[message.id] = message
    }

    override fun findPending(limit: Int): List<RecurrenceOutboxMessage> = storage.values
      .filter { it.status == RecurrenceOutboxStatus.PENDING }
      .sortedBy { it.createdAt }
      .take(limit)

    override fun findById(id: UUID): RecurrenceOutboxMessage? = storage[id]
  }
}
