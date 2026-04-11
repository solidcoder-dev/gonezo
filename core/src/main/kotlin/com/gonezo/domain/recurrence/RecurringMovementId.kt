package com.gonezo.recurrence.domain

import java.util.UUID

@JvmInline
value class RecurringMovementId(val value: UUID) {
  override fun toString(): String = value.toString()

  companion object {
    fun random(): RecurringMovementId = RecurringMovementId(UUID.randomUUID())

    fun from(raw: String): RecurringMovementId = RecurringMovementId(UUID.fromString(raw))
  }
}
