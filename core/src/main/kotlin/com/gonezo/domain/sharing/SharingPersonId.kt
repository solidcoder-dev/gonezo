package com.gonezo.sharing.domain

import java.util.UUID

data class SharingPersonId(val value: UUID) {
  companion object {
    fun random(): SharingPersonId = SharingPersonId(UUID.randomUUID())

    fun from(raw: String): SharingPersonId = SharingPersonId(UUID.fromString(raw))
  }

  override fun toString(): String = value.toString()
}
