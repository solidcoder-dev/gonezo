package com.gonezo.expected.domain

import java.util.UUID

@JvmInline
value class ExpectedMovementId(val value: UUID) {
  override fun toString(): String = value.toString()

  companion object {
    fun random(): ExpectedMovementId = ExpectedMovementId(UUID.randomUUID())

    fun from(raw: String): ExpectedMovementId = ExpectedMovementId(UUID.fromString(raw))
  }
}
