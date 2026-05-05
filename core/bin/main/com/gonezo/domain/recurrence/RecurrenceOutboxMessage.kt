package com.gonezo.recurrence.domain

import java.time.Instant
import java.util.UUID

data class RecurrenceOutboxMessage(
  val id: UUID,
  val aggregateId: RecurringMovementId,
  val occurrenceId: UUID?,
  val eventType: String,
  val payloadJson: String,
  val status: RecurrenceOutboxStatus,
  val attempts: Int,
  val lastError: String?,
  val createdAt: Instant,
  val publishedAt: Instant?,
) {
  init {
    require(eventType.isNotBlank()) { "eventType is required" }
    require(payloadJson.isNotBlank()) { "payloadJson is required" }
    require(attempts >= 0) { "attempts must be greater or equal to 0" }
  }
}
