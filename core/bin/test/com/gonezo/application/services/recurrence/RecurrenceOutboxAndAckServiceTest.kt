package com.gonezo.application.services.recurrence

import com.gonezo.recurrence.application.AcknowledgeRecurringMovementOccurrenceCommand
import com.gonezo.recurrence.application.AcknowledgeRecurringMovementOccurrenceService
import com.gonezo.recurrence.application.AcknowledgeRecurringMovementOccurrenceStatus
import com.gonezo.recurrence.application.PublishRecurrenceOutboxCommand
import com.gonezo.recurrence.application.PublishRecurrenceOutboxService
import com.gonezo.recurrence.application.RecurrenceOutboxEventPublisher
import com.gonezo.recurrence.domain.RecurrenceOutboxMessage
import com.gonezo.recurrence.domain.RecurrenceOutboxStatus
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementOccurrence
import com.gonezo.recurrence.domain.RecurringMovementOccurrenceStatus
import com.gonezo.recurrence.domain.ports.RecurrenceOutboxRepository
import com.gonezo.recurrence.domain.ports.RecurringMovementOccurrenceRepository
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

class RecurrenceOutboxAndAckServiceTest {
  @Test
  fun `acknowledge posted is idempotent for duplicate callbacks`() {
    val repository = InMemoryOccurrenceRepository()
    val service = AcknowledgeRecurringMovementOccurrenceService(repository)
    val occurrence = RecurringMovementOccurrence.pending(
      id = UUID.randomUUID(),
      recurringMovementId = RecurringMovementId.random(),
      dueAt = Instant.parse("2026-04-11T09:00:00Z"),
      createdAt = Instant.parse("2026-04-11T09:01:00Z"),
    )
    repository.save(occurrence)

    val first = service.execute(
      AcknowledgeRecurringMovementOccurrenceCommand(
        occurrenceId = occurrence.id,
        status = AcknowledgeRecurringMovementOccurrenceStatus.POSTED,
        ledgerTransactionId = "tx-123",
        errorCode = null,
        errorMessage = null,
        acknowledgedAt = Instant.parse("2026-04-11T09:02:00Z"),
      ),
    )
    val duplicate = service.execute(
      AcknowledgeRecurringMovementOccurrenceCommand(
        occurrenceId = occurrence.id,
        status = AcknowledgeRecurringMovementOccurrenceStatus.POSTED,
        ledgerTransactionId = "tx-123",
        errorCode = null,
        errorMessage = null,
        acknowledgedAt = Instant.parse("2026-04-11T09:03:00Z"),
      ),
    )

    assertThat(first.status).isEqualTo(RecurringMovementOccurrenceStatus.POSTED)
    assertThat(first.ledgerTransactionId).isEqualTo("tx-123")
    assertThat(duplicate).isEqualTo(first)
  }

  @Test
  fun `acknowledge failed stores failure details`() {
    val repository = InMemoryOccurrenceRepository()
    val service = AcknowledgeRecurringMovementOccurrenceService(repository)
    val occurrence = RecurringMovementOccurrence.pending(
      id = UUID.randomUUID(),
      recurringMovementId = RecurringMovementId.random(),
      dueAt = Instant.parse("2026-04-11T09:00:00Z"),
      createdAt = Instant.parse("2026-04-11T09:01:00Z"),
    )
    repository.save(occurrence)

    val failed = service.execute(
      AcknowledgeRecurringMovementOccurrenceCommand(
        occurrenceId = occurrence.id,
        status = AcknowledgeRecurringMovementOccurrenceStatus.FAILED,
        ledgerTransactionId = null,
        errorCode = "ACCOUNT_ARCHIVED",
        errorMessage = "Archived account",
        acknowledgedAt = Instant.parse("2026-04-11T09:05:00Z"),
      ),
    )

    assertThat(failed.status).isEqualTo(RecurringMovementOccurrenceStatus.FAILED)
    assertThat(failed.errorCode).isEqualTo("ACCOUNT_ARCHIVED")
    assertThat(failed.errorMessage).isEqualTo("Archived account")
  }

  @Test
  fun `acknowledge posted requires ledger transaction id`() {
    val repository = InMemoryOccurrenceRepository()
    val service = AcknowledgeRecurringMovementOccurrenceService(repository)
    val occurrence = RecurringMovementOccurrence.pending(
      id = UUID.randomUUID(),
      recurringMovementId = RecurringMovementId.random(),
      dueAt = Instant.parse("2026-04-11T09:00:00Z"),
      createdAt = Instant.parse("2026-04-11T09:01:00Z"),
    )
    repository.save(occurrence)

    assertThatThrownBy {
      service.execute(
        AcknowledgeRecurringMovementOccurrenceCommand(
          occurrenceId = occurrence.id,
          status = AcknowledgeRecurringMovementOccurrenceStatus.POSTED,
          ledgerTransactionId = " ",
          errorCode = null,
          errorMessage = null,
          acknowledgedAt = Instant.parse("2026-04-11T09:02:00Z"),
        ),
      )
    }
      .isInstanceOf(IllegalArgumentException::class.java)
      .hasMessageContaining("ledgerTransactionId")
  }

  @Test
  fun `publish outbox marks successes and failures with attempts`() {
    val repository = InMemoryOutboxRepository()
    val publishedMessageIds = mutableListOf<UUID>()
    val service = PublishRecurrenceOutboxService(
      outboxRepository = repository,
      publisher = object : RecurrenceOutboxEventPublisher {
        override fun publish(message: RecurrenceOutboxMessage) {
          if (message.eventType == "will_fail") {
            throw IllegalStateException("broker unavailable")
          }
          publishedMessageIds += message.id
        }
      },
    )

    val successMessage = RecurrenceOutboxMessage(
      id = UUID.randomUUID(),
      aggregateId = RecurringMovementId.random(),
      occurrenceId = UUID.randomUUID(),
      eventType = "ok",
      payloadJson = """{"sample":true}""",
      status = RecurrenceOutboxStatus.PENDING,
      attempts = 0,
      lastError = null,
      createdAt = Instant.parse("2026-04-11T10:00:00Z"),
      publishedAt = null,
    )
    val failingMessage = successMessage.copy(
      id = UUID.randomUUID(),
      eventType = "will_fail",
    )
    repository.save(successMessage)
    repository.save(failingMessage)

    val result = service.execute(
      PublishRecurrenceOutboxCommand(
        limit = 20,
        publishedAt = Instant.parse("2026-04-11T10:10:00Z"),
      ),
    )

    val loadedSuccess = repository.findById(successMessage.id)
    val loadedFailure = repository.findById(failingMessage.id)

    assertThat(result.processed).isEqualTo(2)
    assertThat(result.published).isEqualTo(1)
    assertThat(result.failed).isEqualTo(1)
    assertThat(publishedMessageIds).containsExactly(successMessage.id)

    assertThat(loadedSuccess!!.status).isEqualTo(RecurrenceOutboxStatus.PUBLISHED)
    assertThat(loadedSuccess.attempts).isEqualTo(1)
    assertThat(loadedSuccess.publishedAt).isEqualTo(Instant.parse("2026-04-11T10:10:00Z"))

    assertThat(loadedFailure!!.status).isEqualTo(RecurrenceOutboxStatus.FAILED)
    assertThat(loadedFailure.attempts).isEqualTo(1)
    assertThat(loadedFailure.lastError).contains("broker unavailable")
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
