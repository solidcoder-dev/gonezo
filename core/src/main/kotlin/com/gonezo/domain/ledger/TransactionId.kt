package com.gonezo.ledger.domain

import java.util.UUID

data class TransactionId(val value: UUID) {
  companion object {
    fun random(): TransactionId = TransactionId(UUID.randomUUID())

    fun from(raw: String): TransactionId = TransactionId(UUID.fromString(raw))
  }

  override fun toString(): String = value.toString()
}
