package com.gonezo.infrastructure.recurrence

import com.gonezo.application.orchestration.HandleRecurringMovementDueForExpectedCommand
import com.gonezo.application.orchestration.HandleRecurringMovementDueForExpectedResult
import com.gonezo.application.orchestration.HandleRecurringMovementDueForExpectedUC
import com.gonezo.expected.domain.ExpectedMovementId
import com.gonezo.recurrence.application.RecurringMovementDueIntegrationEvent
import com.gonezo.recurrence.domain.RecurrenceOutboxMessage
import com.gonezo.recurrence.domain.RecurrenceOutboxStatus
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.infrastructure.scheduling.InProcessRecurrenceOutboxEventPublisher
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import java.util.UUID

class InProcessRecurrenceOutboxEventPublisherTest {
  @Test
  fun `publishes recurring due event to expected handler`() {
    val captured = mutableListOf<HandleRecurringMovementDueForExpectedCommand>()
    val uc = object : HandleRecurringMovementDueForExpectedUC {
      override fun execute(command: HandleRecurringMovementDueForExpectedCommand): HandleRecurringMovementDueForExpectedResult {
        captured += command
        return HandleRecurringMovementDueForExpectedResult(
          expectedMovementId = ExpectedMovementId.random(),
          created = true,
        )
      }
    }

    val publisher = InProcessRecurrenceOutboxEventPublisher(
      handleRecurringMovementDueForExpectedUC = uc,
      clock = Clock.fixed(Instant.parse("2026-06-10T09:02:00Z"), ZoneOffset.UTC),
    )

    val event = RecurringMovementDueIntegrationEvent(
      eventId = UUID.fromString("c926398d-f70d-4dd1-ac6a-b34f2a775da6"),
      recurringMovementId = "5ff5a4fe-2f13-444b-b2dd-fbc7131eb58c",
      occurrenceId = "f827e9ef-b8f1-4a52-b677-b5e02d753f18",
      dueAt = "2026-06-10T09:00:00Z",
      movementType = "expense",
      sourceAccountId = "2fef15c0-59c6-4fc8-8f30-7276f4f0e619",
      targetAccountId = null,
      amount = "15.00",
      currency = "USD",
      destinationAmount = null,
      destinationCurrency = null,
      exchangeRate = null,
      description = "Recurring",
      merchant = "Merchant",
      reviewPolicy = "require_user_confirmation",
    )

    publisher.publish(
      RecurrenceOutboxMessage(
        id = UUID.randomUUID(),
        aggregateId = RecurringMovementId.random(),
        occurrenceId = UUID.fromString(event.occurrenceId),
        eventType = RecurringMovementDueIntegrationEvent.EVENT_TYPE,
        payloadJson = event.toJson(),
        status = RecurrenceOutboxStatus.PENDING,
        attempts = 0,
        lastError = null,
        createdAt = Instant.parse("2026-06-10T09:00:01Z"),
        publishedAt = null,
      ),
    )

    assertThat(captured).hasSize(1)
    assertThat(captured.first().handledAt).isEqualTo(Instant.parse("2026-06-10T09:02:00Z"))
    assertThat(captured.first().event.occurrenceId).isEqualTo(event.occurrenceId)
  }

  @Test
  fun `ignores automatic recurring due event for expected handler`() {
    val captured = mutableListOf<HandleRecurringMovementDueForExpectedCommand>()
    val uc = object : HandleRecurringMovementDueForExpectedUC {
      override fun execute(command: HandleRecurringMovementDueForExpectedCommand): HandleRecurringMovementDueForExpectedResult {
        captured += command
        return HandleRecurringMovementDueForExpectedResult(
          expectedMovementId = ExpectedMovementId.random(),
          created = true,
        )
      }
    }
    val publisher = InProcessRecurrenceOutboxEventPublisher(uc)
    val event = RecurringMovementDueIntegrationEvent(
      eventId = UUID.randomUUID(),
      recurringMovementId = UUID.randomUUID().toString(),
      occurrenceId = UUID.randomUUID().toString(),
      dueAt = "2026-06-10T09:00:00Z",
      movementType = "expense",
      sourceAccountId = UUID.randomUUID().toString(),
      targetAccountId = null,
      amount = "15.00",
      currency = "USD",
      destinationAmount = null,
      destinationCurrency = null,
      exchangeRate = null,
      description = "Recurring",
      merchant = "Merchant",
      reviewPolicy = "automatic",
    )

    publisher.publish(
      RecurrenceOutboxMessage(
        id = UUID.randomUUID(),
        aggregateId = RecurringMovementId.random(),
        occurrenceId = UUID.fromString(event.occurrenceId),
        eventType = RecurringMovementDueIntegrationEvent.EVENT_TYPE,
        payloadJson = event.toJson(),
        status = RecurrenceOutboxStatus.PENDING,
        attempts = 0,
        lastError = null,
        createdAt = Instant.parse("2026-06-10T09:00:01Z"),
        publishedAt = null,
      ),
    )

    assertThat(captured).isEmpty()
  }

  @Test
  fun `throws on unsupported event type`() {
    val uc = object : HandleRecurringMovementDueForExpectedUC {
      override fun execute(command: HandleRecurringMovementDueForExpectedCommand): HandleRecurringMovementDueForExpectedResult =
        HandleRecurringMovementDueForExpectedResult(
          expectedMovementId = ExpectedMovementId.random(),
          created = true,
        )
    }
    val publisher = InProcessRecurrenceOutboxEventPublisher(uc)

    assertThatThrownBy {
      publisher.publish(
        RecurrenceOutboxMessage(
          id = UUID.randomUUID(),
          aggregateId = RecurringMovementId.random(),
          occurrenceId = null,
          eventType = "unsupported.event.v1",
          payloadJson = "{}",
          status = RecurrenceOutboxStatus.PENDING,
          attempts = 0,
          lastError = null,
          createdAt = Instant.parse("2026-06-10T09:00:01Z"),
          publishedAt = null,
        ),
      )
    }
      .isInstanceOf(IllegalArgumentException::class.java)
      .hasMessageContaining("Unsupported recurrence outbox event type")
  }
}
