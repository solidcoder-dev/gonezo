package com.gonezo.domain.ledger

import java.util.UUID

data class CategoryId(val value: UUID) {
  companion object {
    fun from(raw: String): CategoryId = CategoryId(UUID.fromString(raw))
  }

  override fun toString(): String = value.toString()
}
