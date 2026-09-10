package com.gonezo.sharing.domain

import java.time.Instant

data class SharingPerson(val id: SharingPersonId, val displayName: String, val normalizedName: String, val createdAt: Instant, val archivedAt: Instant?) {
    init {
        require(displayName.isNotBlank()) { "sharing person display name is required" }
        require(normalizedName.isNotBlank()) { "sharing person normalized name is required" }
    }

    fun rename(newDisplayName: String): SharingPerson {
        val cleanName = newDisplayName.trim()
        require(cleanName.isNotBlank()) { "sharing person display name is required" }
        return copy(
            displayName = cleanName,
            normalizedName = normalizeName(cleanName),
        )
    }

    companion object {
        fun create(id: SharingPersonId, displayName: String, createdAt: Instant): SharingPerson {
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
