package com.gonezo.domain.ledger

import java.util.UUID

data class TransactionItemId(val value: UUID) {
  companion object {
    fun random(): TransactionItemId = TransactionItemId(UUID.randomUUID())

    fun from(raw: String): TransactionItemId = TransactionItemId(UUID.fromString(raw))
  }

  override fun toString(): String = value.toString()
}
