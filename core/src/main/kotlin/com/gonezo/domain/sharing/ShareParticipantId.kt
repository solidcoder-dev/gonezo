package com.gonezo.sharing.domain

import java.util.UUID

data class ShareParticipantId(val value: UUID) {
  companion object {
    fun random(): ShareParticipantId = ShareParticipantId(UUID.randomUUID())

    fun from(raw: String): ShareParticipantId = ShareParticipantId(UUID.fromString(raw))
  }

  override fun toString(): String = value.toString()
}
