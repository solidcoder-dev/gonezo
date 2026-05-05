package com.gonezo.recurrence.domain.ports

import com.gonezo.recurrence.domain.RecurrenceOutboxMessage
import java.util.UUID

interface RecurrenceOutboxRepository {
  fun save(message: RecurrenceOutboxMessage)

  fun findPending(limit: Int): List<RecurrenceOutboxMessage>

  fun findById(id: UUID): RecurrenceOutboxMessage?
}
