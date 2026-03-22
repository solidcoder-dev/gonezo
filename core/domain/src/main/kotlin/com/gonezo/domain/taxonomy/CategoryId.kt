package com.gonezo.domain.taxonomy

import java.util.UUID

data class CategoryId(val value: UUID) {
  companion object {
    fun random(): CategoryId = CategoryId(UUID.randomUUID())

    fun from(raw: String): CategoryId = CategoryId(UUID.fromString(raw))
  }

  override fun toString(): String = value.toString()
}
