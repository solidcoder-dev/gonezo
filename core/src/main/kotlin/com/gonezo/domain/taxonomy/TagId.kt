package com.gonezo.taxonomy.domain

import java.util.UUID

@JvmInline
value class TagId(val value: UUID) {
  override fun toString(): String = value.toString()

  companion object {
    fun random(): TagId = TagId(UUID.randomUUID())

    fun from(raw: String): TagId = TagId(UUID.fromString(raw))
  }
}
