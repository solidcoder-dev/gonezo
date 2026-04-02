package com.gonezo.ledger.domain

import java.util.UUID

data class AccountId(val value: UUID) {
  companion object {
    fun random(): AccountId = AccountId(UUID.randomUUID())

    fun from(raw: String): AccountId = AccountId(UUID.fromString(raw))
  }

  override fun toString(): String = value.toString()
}
