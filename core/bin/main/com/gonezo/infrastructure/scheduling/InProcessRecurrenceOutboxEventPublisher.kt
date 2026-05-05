package com.gonezo.recurrence.infrastructure.scheduling

import com.gonezo.application.orchestration.HandleRecurringMovementDueForExpectedCommand
import com.gonezo.application.orchestration.HandleRecurringMovementDueForExpectedUC
import com.gonezo.recurrence.application.RecurrenceOutboxEventPublisher
import com.gonezo.recurrence.application.RecurringMovementDueIntegrationEvent
import com.gonezo.recurrence.domain.RecurrenceOutboxMessage
import java.time.Clock

class InProcessRecurrenceOutboxEventPublisher(
  private val handleRecurringMovementDueForExpectedUC: HandleRecurringMovementDueForExpectedUC,
  private val clock: Clock = Clock.systemUTC(),
) : RecurrenceOutboxEventPublisher {
  override fun publish(message: RecurrenceOutboxMessage) {
    when (message.eventType) {
      RecurringMovementDueIntegrationEvent.EVENT_TYPE -> {
        handleRecurringMovementDueForExpectedUC.execute(
          HandleRecurringMovementDueForExpectedCommand(
            event = RecurringMovementDueIntegrationEvent.fromJson(message.payloadJson),
            handledAt = clock.instant(),
          ),
        )
      }

      else -> throw IllegalArgumentException("Unsupported recurrence outbox event type: ${message.eventType}")
    }
  }
}
