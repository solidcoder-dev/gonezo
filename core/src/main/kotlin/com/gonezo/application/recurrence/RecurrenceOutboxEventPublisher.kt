package com.gonezo.recurrence.application

import com.gonezo.recurrence.domain.RecurrenceOutboxMessage

interface RecurrenceOutboxEventPublisher {
  fun publish(message: RecurrenceOutboxMessage)
}
