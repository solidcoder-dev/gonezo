package com.gonezo.recurrence.infrastructure.scheduling

import com.gonezo.application.orchestration.HandleRecurringMovementDueForExpectedCommand
import com.gonezo.application.orchestration.HandleRecurringMovementDueForExpectedUC
import com.gonezo.recurrence.application.RecurrenceOutboxEventPublisher
import com.gonezo.recurrence.application.RecurringMovementDueIntegrationEvent
import com.gonezo.recurrence.domain.RecurrenceOutboxMessage
import com.gonezo.recurrence.domain.RecurringMovementReviewPolicy
import java.time.Clock

class InProcessRecurrenceOutboxEventPublisher(
  private val handleRecurringMovementDueForExpectedUC: HandleRecurringMovementDueForExpectedUC,
  private val clock: Clock = Clock.systemUTC(),
) : RecurrenceOutboxEventPublisher {
  override fun publish(message: RecurrenceOutboxMessage) {
    when (message.eventType) {
      RecurringMovementDueIntegrationEvent.EVENT_TYPE -> {
        val event = RecurringMovementDueIntegrationEvent.fromJson(message.payloadJson)
        when (RecurringMovementReviewPolicy.from(event.reviewPolicy)) {
          RecurringMovementReviewPolicy.AUTOMATIC -> Unit
          RecurringMovementReviewPolicy.REQUIRE_USER_CONFIRMATION -> {
            handleRecurringMovementDueForExpectedUC.execute(
              HandleRecurringMovementDueForExpectedCommand(
                event = event,
                handledAt = clock.instant(),
              ),
            )
          }
        }
      }

      else -> throw IllegalArgumentException("Unsupported recurrence outbox event type: ${message.eventType}")
    }
  }
}
