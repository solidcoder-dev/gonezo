package com.gonezo.sharing.domain

import java.time.Instant

data class SharingPerson(
  val id: SharingPersonId,
  val displayName: String,
  val normalizedName: String,
  val createdAt: Instant,
  val archivedAt: Instant?,
) {
  init {
    require(displayName.isNotBlank()) { "sharing person display name is required" }
    require(normalizedName.isNotBlank()) { "sharing person normalized name is required" }
  }

  companion object {
    fun create(
      id: SharingPersonId,
      displayName: String,
      createdAt: Instant,
    ): SharingPerson {
      val cleanName = displayName.trim()
      return SharingPerson(
        id = id,
        displayName = cleanName,
        normalizedName = normalizeName(cleanName),
        createdAt = createdAt,
        archivedAt = null,
      )
    }

    fun normalizeName(name: String): String = name.trim().lowercase().replace(Regex("\\s+"), " ")
  }
}
