package com.gonezo.sharing.domain

import java.util.UUID

data class ExpenseShareId(val value: UUID) {
  companion object {
    fun random(): ExpenseShareId = ExpenseShareId(UUID.randomUUID())

    fun from(raw: String): ExpenseShareId = ExpenseShareId(UUID.fromString(raw))
  }

  override fun toString(): String = value.toString()
}
